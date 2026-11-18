
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

const WebPreviewSession = require("../models/WebPreviewSession");
const Project = require("../models/Project");

const {
  sanitizeGeneratedFlutterCode,
} = require("./exact500AppTemplates/flutterCodeSafety");

const selfHealingBuild = require("./selfHealingBuild");

const {
  normalizeProjectFiles,
  repairStructuredProject,
} = require("./flutterProjectStructure");

const MAX_LOG_CHARS = Number(
  process.env.WEB_PREVIEW_MAX_LOG_CHARS || 120000
);

const BUILD_CONCURRENCY = Math.max(
  1,
  Number(
    process.env.WEB_PREVIEW_CONCURRENCY || 2
  )
);

const BUILD_TIMEOUT_MS = Math.max(
  60_000,
  Number(
    process.env.WEB_PREVIEW_BUILD_TIMEOUT_MS ||
      300000
  )
);

/* ============================================================
   LOAD VERIFIED FALLBACK CANDIDATES
   ============================================================ */

async function loadVerifiedFallbackCandidates(
  projectId,
  failedCode = ""
) {
  if (!projectId) return [];

  try {
    const project =
      await Project.findById(projectId)
        .select(
          "+lastKnownGoodCode currentCode generatedCode versions version lastKnownGoodVersion"
        )
        .lean();

    if (!project) return [];

    const candidates = [];

    const seen = new Set([
      String(failedCode || ""),
    ]);

    const add = (
      code,
      version,
      source
    ) => {
      const value =
        String(code || "").trim();

      if (
        !value ||
        seen.has(value) ||
        !value.includes("void main")
      ) {
        return;
      }

      seen.add(value);

      candidates.push({
        code: value,
        version: Number(
          version || 0
        ),
        source,
      });
    };

    add(
      project.lastKnownGoodCode,
      project.lastKnownGoodVersion,
      "last-known-good"
    );

    const versions =
      Array.isArray(project.versions)
        ? [...project.versions].reverse()
        : [];

    for (
      const item of versions
    ) {
      add(
        item?.generatedCode,
        item?.version,
        "previous-project-version"
      );
    }

    add(
      project.currentCode,
      project.version,
      "current-project-code"
    );

    add(
      project.generatedCode,
      project.version,
      "generated-project-code"
    );

    return candidates.slice(
      0,
      4
    );
  } catch (error) {
    console.warn(
      `[web-preview] could not load fallback project versions: ${
        error.message || error
      }`
    );

    return [];
  }
}

/* ============================================================
   MARK VERIFIED PROJECT CODE
   ============================================================ */

async function markProjectCodeVerified(
  projectId,
  code,
  version = 0
) {
  if (
    !projectId ||
    !String(code || "").trim()
  ) {
    return;
  }

  try {
    await Project.updateOne(
      {
        _id: projectId,
      },
      {
        $set: {
          lastKnownGoodCode:
            String(code),

          lastKnownGoodVersion:
            Number(version || 0),

          lastKnownGoodAt:
            new Date(),
        },
      }
    );
  } catch (error) {
    console.warn(
      `[web-preview] could not persist last-known-good code: ${
        error.message || error
      }`
    );
  }
}

/* ============================================================
   ENV PATH HELPERS
   ============================================================ */

function cleanEnvPath(
  value = ""
) {
  return String(value || "")
    .trim()
    .replace(
      /^["']|["']$/g,
      ""
    )
    .replace(/\\/g, "/");
}

/* ============================================================
   GET FLUTTER PATH
   ============================================================ */

function getFlutterPath() {
  const configured =
    cleanEnvPath(
      process.env.FLUTTER_PATH || ""
    );

  /*
   * FLUTTER_PATH may be:
   *
   * C:/flutter/bin/flutter.bat
   * C:/flutter/bin
   * C:/flutter
   *
   * Keep default as "flutter" for PATH setups.
   */

  if (!configured) {
    return "flutter";
  }

  if (
    /^flutter(?:\.(?:bat|cmd|exe))?$/i.test(
      configured
    )
  ) {
    return configured;
  }

  const lower =
    configured.toLowerCase();

  const isWindows =
    process.platform === "win32";

  const executableNames =
    isWindows
      ? [
          "flutter.bat",
          "flutter.cmd",
          "flutter.exe",
        ]
      : [
          "flutter",
        ];

  if (
    executableNames.some(
      (name) =>
        lower.endsWith(
          `/${name}`
        )
    )
  ) {
    return configured;
  }

  /*
   * If configured path exists and is a directory,
   * resolve Flutter executable.
   */

  try {
    if (
      fs.existsSync(
        configured
      ) &&
      fs.statSync(
        configured
      ).isDirectory()
    ) {
      const candidates =
        isWindows
          ? [
              path.join(
                configured,
                "flutter.bat"
              ),
              path.join(
                configured,
                "flutter.cmd"
              ),
              path.join(
                configured,
                "bin",
                "flutter.bat"
              ),
              path.join(
                configured,
                "bin",
                "flutter.cmd"
              ),
            ]
          : [
              path.join(
                configured,
                "flutter"
              ),
              path.join(
                configured,
                "bin",
                "flutter"
              ),
            ];

      const found =
        candidates.find(
          (candidate) =>
            fs.existsSync(
              candidate
            )
        );

      if (found) {
        return cleanEnvPath(
          found
        );
      }
    }
  } catch (_) {
    // Ignore path probing failures.
  }

  /*
   * Handle SDK/bin paths even if the
   * path does not currently exist.
   */

  if (isWindows) {
    if (
      /\/bin$/i.test(
        configured
      )
    ) {
      return `${configured}/flutter.bat`;
    }

    return `${configured}/bin/flutter.bat`;
  }

  if (
    /\/bin$/i.test(
      configured
    )
  ) {
    return `${configured}/flutter`;
  }

  return `${configured}/bin/flutter`;
}

/* ============================================================
   WORK ROOT
   ============================================================ */

function getWorkRoot() {
  return cleanEnvPath(
    process.env.WEB_PREVIEW_WORK_ROOT ||
      path.join(
        os.tmpdir(),
        "vibeapp",
        "web-previews"
      )
  );
}

/* ============================================================
   WINDOWS COMMAND INVOCATION
   ============================================================ */

function windowsCmdInvocation(
  command,
  args = []
) {
  if (
    process.platform !== "win32" ||
    !/\.(bat|cmd)$/i.test(
      command
    )
  ) {
    return {
      command,
      args,
      windowsVerbatimArguments:
        false,
    };
  }

  /*
   * .bat/.cmd files must run through cmd.exe.
   */

  const quoteForCmd = (
    value
  ) => {
    const text =
      String(
        value ?? ""
      );

    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  };

  const commandLine =
    `call ${quoteForCmd(
      command
    )} ${args
      .map(quoteForCmd)
      .join(" ")}`.trim();

  return {
    command:
      process.env.ComSpec ||
      "cmd.exe",

    args: [
      "/d",
      "/s",
      "/c",
      commandLine,
    ],

    windowsVerbatimArguments:
      true,
  };
}

/* ============================================================
   BOUNDED LOG
   ============================================================ */

function appendBounded(
  current,
  chunk
) {
  const next =
    `${current || ""}${chunk || ""}`;

  if (
    next.length <=
    MAX_LOG_CHARS
  ) {
    return next;
  }

  return next.slice(
    next.length -
      MAX_LOG_CHARS
  );
}

/* ============================================================
   EXTRA PACKAGE DETECTION
   ============================================================ */

function detectExtraPackages(
  dartCode = ""
) {
  return {
    supabase:
      /import\s+['"]package:supabase_flutter\/supabase_flutter\.dart['"]\s*;/.test(
        dartCode
      ),

    sharedPreferences:
      /import\s+['"]package:shared_preferences\/shared_preferences\.dart['"]\s*;/.test(
        dartCode
      ),

    hive:
      /import\s+['"]package:hive_flutter\/hive_flutter\.dart['"]\s*;/.test(
        dartCode
      ),
  };
}

/* ============================================================
   PATCH PUBSPEC
   ============================================================ */

function patchPubspec(
  projectPath,
  extraPackages = {}
) {
  const pubspecPath =
    path.join(
      projectPath,
      "pubspec.yaml"
    );

  if (
    !fs.existsSync(
      pubspecPath
    )
  ) {
    return;
  }

  let content =
    fs.readFileSync(
      pubspecPath,
      "utf8"
    );

  const hasSupabase =
    content.includes(
      "supabase_flutter:"
    );

  const hasSharedPreferences =
    content.includes(
      "shared_preferences:"
    );

  const hasHive =
    content.includes(
      "hive_flutter:"
    );

  let changed = false;

  if (
    extraPackages.supabase &&
    !hasSupabase
  ) {
    const dependencyAnchor =
      /([ \t]*cupertino_icons:[^\n]*\n)/;

    if (
      dependencyAnchor.test(
        content
      )
    ) {
      content =
        content.replace(
          dependencyAnchor,
          "$1  supabase_flutter: ^2.5.0\n"
        );
    } else {
      content =
        content.replace(
          /dependencies:\s*\n/,
          "dependencies:\n  supabase_flutter: ^2.5.0\n"
        );
    }

    changed = true;
  }

  if (
    extraPackages.sharedPreferences &&
    !hasSharedPreferences
  ) {
    content =
      content.replace(
        /dependencies:\s*\n/,
        "dependencies:\n  shared_preferences: ^2.2.3\n"
      );

    changed = true;
  }

  if (
    extraPackages.hive &&
    !hasHive
  ) {
    content =
      content.replace(
        /^dependencies:\s*\n/m,
        "dependencies:\n  hive_flutter: ^1.1.0\n"
      );

    changed = true;
  }

  if (changed) {
    fs.writeFileSync(
      pubspecPath,
      content,
      "utf8"
    );
  }
}

/* ============================================================
   REMOVE DIRECTORY
   ============================================================ */

function removeDirectorySafe(
  directory
) {
  if (!directory) {
    return;
  }

  try {
    fs.rmSync(
      directory,
      {
        recursive: true,
        force: true,
      }
    );
  } catch (error) {
    console.warn(
      "Preview cleanup warning:",
      error.message
    );
  }
}

/* ============================================================
   WEB PREVIEW MANAGER
   ============================================================ */

class WebPreviewManager {
  constructor() {
    this.queue = [];
    this.activeCount = 0;
    this.activeProcesses =
      new Map();

    this.cancelled =
      new Set();

    this.started = false;
    this.cleanupTimer =
      null;
  }

  /* ==========================================================
     START
     ========================================================== */

  async start() {
    if (this.started) {
      return;
    }

    this.started = true;

    fs.mkdirSync(
      getWorkRoot(),
      {
        recursive: true,
      }
    );

    try {
      await WebPreviewSession.updateMany(
        {
          status: {
            $in: [
              "queued",
              "building",
            ],
          },
        },
        {
          $set: {
            status:
              "failed",

            message:
              "Preview build was interrupted by a server restart. Please run it again.",

            completedAt:
              new Date(),
          },
        }
      );
    } catch (error) {
      console.warn(
        "Preview recovery warning:",
        error.message
      );
    }

    this.cleanupTimer =
      setInterval(
        () => {
          this.cleanupExpiredArtifacts()
            .catch(
              (error) => {
                console.warn(
                  "Preview expiry cleanup warning:",
                  error.message
                );
              }
            );
        },
        15 *
          60 *
          1000
      );

    if (
      this.cleanupTimer.unref
    ) {
      this.cleanupTimer.unref();
    }
  }

  /* ==========================================================
     STOP
     ========================================================== */

  async stop() {
    if (this.cleanupTimer) {
      clearInterval(
        this.cleanupTimer
      );
    }

    this.cleanupTimer =
      null;

    for (
      const [
        sessionId,
        child,
      ] of this.activeProcesses.entries()
    ) {
      this.cancelled.add(
        sessionId
      );

      this.killChild(
        child
      );
    }

    this.activeProcesses.clear();
  }

  /* ==========================================================
     ENQUEUE
     ========================================================== */

  enqueue(job) {
    this.queue.push(
      job
    );

    this.drain();
  }

  /* ==========================================================
     DRAIN
     ========================================================== */

  drain() {
    while (
      this.activeCount <
        BUILD_CONCURRENCY &&
      this.queue.length >
        0
    ) {
      const job =
        this.queue.shift();

      if (
        !job ||
        this.cancelled.has(
          job.sessionId
        )
      ) {
        continue;
      }

      this.activeCount +=
        1;

      this.processJob(
        job
      )
        .catch(
          (error) => {
            console.error(
              "Web preview build error:",
              error
            );
          }
        )
        .finally(
          () => {
            this.activeCount -=
              1;

            this.drain();
          }
        );
    }
  }

  /* ==========================================================
     CANCEL
     ========================================================== */

  async cancel(
    sessionId
  ) {
    this.cancelled.add(
      sessionId
    );

    this.queue =
      this.queue.filter(
        (job) =>
          job.sessionId !==
          sessionId
      );

    const child =
      this.activeProcesses.get(
        sessionId
      );

    if (child) {
      this.killChild(
        child
      );
    }

    const session =
      await WebPreviewSession.findOne(
        {
          sessionId,
        }
      );

    if (session) {
      removeDirectorySafe(
        session.workspacePath
      );

      session.status =
        "cancelled";

      session.progress =
        100;

      session.message =
        "Preview stopped.";

      session.completedAt =
        new Date();

      session.artifactPath =
        "";

      session.previewUrl =
        "";

      await session.save();
    }
  }

  /* ==========================================================
     KILL CHILD PROCESS
     ========================================================== */

  killChild(child) {
    if (
      !child ||
      child.killed
    ) {
      return;
    }

    try {
      if (
        process.platform ===
          "win32" &&
        child.pid
      ) {
        spawn(
          "taskkill",
          [
            "/pid",
            String(
              child.pid
            ),
            "/f",
            "/t",
          ],
          {
            windowsHide:
              true,
          }
        );
      } else {
        child.kill(
          "SIGTERM"
        );
      }
    } catch (_) {
      // Ignore kill errors.
    }
  }

  /* ==========================================================
     SET STATUS
     ========================================================== */

  async setStatus(
    sessionId,
    fields
  ) {
    try {
      await WebPreviewSession.updateOne(
        {
          sessionId,
        },
        {
          $set:
            fields,
        }
      );
    } catch (error) {
      console.warn(
        `Preview status update failed (${sessionId}):`,
        error.message
      );
    }
  }

  /* ==========================================================
     RUN COMMAND
     ========================================================== */

  async runCommand(
    sessionId,
    command,
    args,
    options = {}
  ) {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        let output =
          "";

        let settled =
          false;

        let timer =
          null;

        const invocation =
          windowsCmdInvocation(
            command,
            args
          );

        const child =
          spawn(
            invocation.command,
            invocation.args,
            {
              cwd:
                options.cwd,

              env:
                process.env,

              shell:
                false,

              windowsHide:
                true,

              windowsVerbatimArguments:
                invocation.windowsVerbatimArguments ===
                true,

              stdio: [
                "ignore",
                "pipe",
                "pipe",
              ],
            }
          );

        this.activeProcesses.set(
          sessionId,
          child
        );

        const finish =
          (error) => {
            if (settled) {
              return;
            }

            settled =
              true;

            if (timer) {
              clearTimeout(
                timer
              );
            }

            if (
              this.activeProcesses.get(
                sessionId
              ) ===
              child
            ) {
              this.activeProcesses.delete(
                sessionId
              );
            }

            if (error) {
              reject(
                error
              );
            } else {
              resolve(
                output
              );
            }
          };

        const capture =
          (data) => {
            const text =
              data.toString();

            output =
              appendBounded(
                output,
                text
              );
          };

        child.stdout.on(
          "data",
          capture
        );

        child.stderr.on(
          "data",
          capture
        );

        child.on(
          "error",
          (error) => {
            finish(
              new Error(
                `${error.message}\nCommand: ${command} ${args.join(
                  " "
                )}`
              )
            );
          }
        );

        child.on(
          "close",
          (
            code,
            signal
          ) => {
            if (
              this.cancelled.has(
                sessionId
              )
            ) {
              return finish(
                new Error(
                  "Preview build cancelled."
                )
              );
            }

            if (
              code === 0
            ) {
              return finish();
            }

            finish(
              new Error(
                `Command failed with code ${code}${
                  signal
                    ? ` (${signal})`
                    : ""
                }.\n${output}`
              )
            );
          }
        );

        timer =
          setTimeout(
            () => {
              this.killChild(
                child
              );

              finish(
                new Error(
                  `Preview build timed out after ${Math.round(
                    BUILD_TIMEOUT_MS /
                      1000
                  )} seconds.\n${output}`
                )
              );
            },
            options.timeoutMs ||
              BUILD_TIMEOUT_MS
          );
      }
    );
  }

  /* ==========================================================
     PROCESS JOB
     ========================================================== */

  async processJob(
    job
  ) {
    const {
      sessionId,
      publicToken,
      rawCode,
      projectId =
        null,
    } = job;

    const projectFiles =
      Array.isArray(
        job?.projectFiles
      )
        ? job.projectFiles
        : [];

    const workspacePath =
      path.join(
        getWorkRoot(),
        sessionId
      );

    const artifactPath =
      path.join(
        workspacePath,
        "build",
        "web"
      );

    let logs = "";

    if (
      this.cancelled.has(
        sessionId
      )
    ) {
      return;
    }

    try {
      /* ------------------------------------------------------
         CREATE CLEAN WORKSPACE
         ------------------------------------------------------ */

      removeDirectorySafe(
        workspacePath
      );

      fs.mkdirSync(
        workspacePath,
        {
          recursive:
            true,
        }
      );

      await this.setStatus(
        sessionId,
        {
          status:
            "building",

          progress:
            10,

          message:
            "Creating isolated Flutter workspace…",

          workspacePath,

          startedAt:
            new Date(),
        }
      );

      logs =
        appendBounded(
          logs,
          await this.runCommand(
            sessionId,
            getFlutterPath(),
            [
              "create",
              "--platforms=web",
              "--project-name",
              `vibe_preview_${sessionId.replace(
                /-/g,
                "_"
              )}`,
              ".",
            ],
            {
              cwd:
                workspacePath,
            }
          )
        );

      if (
        this.cancelled.has(
          sessionId
        )
      ) {
        return;
      }

      /* ------------------------------------------------------
         RESOLVE PROJECT FILES
         ------------------------------------------------------ */

      let currentCode =
        sanitizeGeneratedFlutterCode(
          rawCode || ""
        );

      let currentFiles =
        [];

      /*
       * FIRST SOURCE:
       *
       * Files passed directly with the preview job.
       */

      if (
        projectFiles.length >
        0
      ) {
        currentFiles =
          normalizeProjectFiles(
            projectFiles
          );
      }

      /*
       * SECOND SOURCE:
       *
       * Persisted projectFiles from MongoDB.
       *
       * IMPORTANT:
       *
       * normalizeProjectFiles() accepts ONLY one argument:
       *
       * normalizeProjectFiles(files)
       *
       * The previous code incorrectly passed:
       *
       * normalizeProjectFiles(files, currentCode)
       *
       * which caused the structured project path to behave
       * inconsistently.
       */

      if (
        projectId &&
        currentFiles.length ===
          0
      ) {
        try {
          const project =
            await Project.findById(
              projectId
            )
              .select(
                "projectFiles currentCode generatedCode code"
              )
              .lean();

          const persistedFiles =
            Array.isArray(
              project?.projectFiles
            )
              ? project.projectFiles
              : [];

          if (
            persistedFiles.length >
            0
          ) {
            currentFiles =
              normalizeProjectFiles(
                persistedFiles
              );
          }

          /*
           * If MongoDB does not have structured files,
           * fall back to the legacy single-code fields.
           */

          if (
            currentFiles.length ===
            0
          ) {
            currentCode =
              sanitizeGeneratedFlutterCode(
                currentCode ||
                  project?.currentCode ||
                  project?.generatedCode ||
                  project?.code ||
                  ""
              );
          }
        } catch (
          fileLoadError
        ) {
          console.warn(
            `[web-preview] project file load failed: ${
              fileLoadError.message ||
              fileLoadError
            }`
          );
        }
      }

      /*
       * THIRD SOURCE:
       *
       * Legacy rawCode.
       *
       * Convert it into the same normalized structure
       * so the rest of the pipeline can work consistently.
       */

      if (
        currentFiles.length ===
          0 &&
        currentCode
      ) {
        currentFiles =
          [
            {
              path:
                "lib/main.dart",

              content:
                currentCode,

              language:
                "dart",

              role:
                "entrypoint",
            },
          ];
      }

      /*
       * Nothing available means preview cannot be built.
       */

      if (
        currentFiles.length ===
        0
      ) {
        throw new Error(
          "No Flutter project files are available for preview build."
        );
      }

      /*
       * Keep currentCode synchronized with
       * the actual structured main.dart.
       */

      currentCode =
        currentFiles.find(
          (file) =>
            file.path ===
            "lib/main.dart"
        )?.content ||
        currentCode;

      fs.mkdirSync(
        path.join(
          workspacePath,
          "lib"
        ),
        {
          recursive:
            true,
        }
      );

      const baseHref =
        `/previews/${publicToken}/`;

      let buildSucceeded =
        false;

      let terminalBuildError =
        null;

      let recoveryStrategy =
        "generated-or-repaired";

      let servedFallbackVersion =
        0;

      const maxRepairs =
        selfHealingBuild.MAX_REPAIR_ATTEMPTS;

      /* ======================================================
         BUILD / REPAIR LOOP
         ====================================================== */

      for (
        let attempt = 0;
        attempt <=
          maxRepairs;
        attempt += 1
      ) {
        /*
         * Materialize the complete generated project.
         *
         * currentCode remains the compatibility entrypoint.
         */

        if (
          currentFiles.length >
          1
        ) {
          for (
            const file of
              currentFiles
          ) {
            const target =
              path.join(
                workspacePath,
                file.path
              );

            fs.mkdirSync(
              path.dirname(
                target
              ),
              {
                recursive:
                  true,
              }
            );

            fs.writeFileSync(
              target,
              String(
                file.content ||
                  ""
              ),
              "utf8"
            );
          }
        } else {
          fs.writeFileSync(
            path.join(
              workspacePath,
              "lib",
              "main.dart"
            ),
            currentCode,
            "utf8"
          );
        }

        const extraPackages =
          detectExtraPackages(
            currentFiles
              .map(
                (file) =>
                  file.content
              )
              .join("\n")
          );

        patchPubspec(
          workspacePath,
          extraPackages
        );

        await this.setStatus(
          sessionId,
          {
            progress:
              attempt === 0
                ? 30
                : Math.min(
                    85,
                    58 +
                      attempt *
                        8
                  ),

            message:
              attempt === 0
                ? "Resolving Flutter dependencies…"
                : `AI Build Guardian: verifying preview repair ${attempt}/${maxRepairs}…`,
          }
        );

        logs =
          appendBounded(
            logs,
            await this.runCommand(
              sessionId,
              getFlutterPath(),
              [
                "pub",
                "get",
              ],
              {
                cwd:
                  workspacePath,
              }
            )
          );

        if (
          this.cancelled.has(
            sessionId
          )
        ) {
          return;
        }

        await this.setStatus(
          sessionId,
          {
            progress:
              attempt === 0
                ? 55
                : Math.min(
                    92,
                    65 +
                      attempt *
                        8
                  ),

            message:
              attempt === 0
                ? "Building Flutter Web preview…"
                : "Rebuilding Flutter Web preview after automatic repair…",
          }
        );

        try {
          logs =
            appendBounded(
              logs,
              await this.runCommand(
                sessionId,
                getFlutterPath(),
                [
                  "build",
                  "web",
                  "--release",
                  `--base-href=${baseHref}`,
                ],
                {
                  cwd:
                    workspacePath,
                }
              )
            );

          buildSucceeded =
            true;

          break;
        } catch (
          buildError
        ) {
          const buildLog =
            String(
              buildError?.message ||
                buildError
            );

          logs =
            appendBounded(
              logs,
              `\n[preview-build-attempt-${
                attempt + 1
              }]\n${buildLog}\n`
            );

          if (
            attempt >=
            maxRepairs
          ) {
            terminalBuildError =
              buildError;

            break;
          }

          await this.setStatus(
            sessionId,
            {
              progress:
                Math.min(
                  88,
                  60 +
                    attempt *
                      8
                ),

              message:
                "Preview build issue detected. AI Build Guardian is repairing it…",

              buildLogs:
                logs,
            }
          );

          let repair;

          /* ==================================================
             STRUCTURED MULTI-FILE REPAIR
             ================================================== */

          if (
            currentFiles.length >
            1
          ) {
            /*
             * IMPORTANT:
             *
             * repairStructuredProject() expects:
             *
             * {
             *   prompt,
             *   files,
             *   errors,
             *   appSpec,
             *   supabaseConfig
             * }
             *
             * The old code incorrectly sent:
             *
             * {
             *   files,
             *   buildLog,
             *   originalPrompt
             * }
             */

            repair =
              await repairStructuredProject(
                {
                  prompt:
                    "",

                  files:
                    currentFiles,

                  errors:
                    [
                      buildLog,
                    ],

                  appSpec:
                    null,

                  supabaseConfig:
                    null,
                }
              );

            /*
             * Claude structured repair returns:
             *
             * {
             *   files,
             *   entrypoint,
             *   source,
             *   model,
             *   ...
             * }
             */

            if (
              !Array.isArray(
                repair?.files
              ) ||
              repair.files
                .length ===
                0
            ) {
              throw new Error(
                "Claude structured repair returned zero project files."
              );
            }

            currentFiles =
              normalizeProjectFiles(
                repair.files
              );

            currentCode =
              currentFiles.find(
                (file) =>
                  file.path ===
                  "lib/main.dart"
              )?.content ||
              currentCode;

            /*
             * Keep compatibility with the existing
             * self-healing pipeline.
             */

            repair.changed =
              true;

            repair.updatedCode =
              currentCode;

            repair.strategy =
              repair.strategy ||
              "claude-structured-repair";

            repair.categories =
              Array.isArray(
                repair.categories
              )
                ? repair.categories
                : [];

            repair.summary =
              repair.summary ||
              "Claude returned a repaired Flutter project.";
          }

          /* ==================================================
             SINGLE-FILE SELF-HEALING REPAIR
             ================================================== */

          else {
            repair =
              await selfHealingBuild.repairCode(
                {
                  code:
                    currentCode,

                  buildLog,

                  attempt:
                    attempt +
                    1,

                  originalPrompt:
                    "",
                }
              );
          }

          const categories =
            Array.isArray(
              repair?.categories
            )
              ? repair.categories
              : [];

          logs =
            appendBounded(
              logs,
              `\n[preview-repair-${
                attempt + 1
              }] strategy=${
                repair?.strategy ||
                "unknown"
              }; categories=${categories
                .map(
                  (item) =>
                    item?.type ||
                    String(
                      item
                    )
                )
                .join(
                  ","
                )}; ${
                repair?.summary ||
                "Repair completed."
              }\n`
            );

          if (
            !repair ||
            repair.changed !==
              true
          ) {
            terminalBuildError =
              new Error(
                `${buildLog}\nPreview self-healing could not apply a safe repair: ${
                  repair?.summary ||
                  "Unknown repair result."
                }`
              );

            break;
          }

          if (
            !repair.updatedCode
          ) {
            throw new Error(
              "Repair did not return updated Flutter code."
            );
          }

          currentCode =
            sanitizeGeneratedFlutterCode(
              repair.updatedCode
            );

          /*
           * Keep main.dart synchronized
           * after repair.
           *
           * IMPORTANT:
           *
           * normalizeProjectFiles() accepts
           * ONLY files.
           */

          if (
            currentFiles.length >
            1
          ) {
            currentFiles =
              normalizeProjectFiles(
                currentFiles.map(
                  (file) =>
                    file.path ===
                    "lib/main.dart"
                      ? {
                          ...file,
                          content:
                            currentCode,
                        }
                      : file
                )
              );
          } else {
            currentFiles =
              [
                {
                  path:
                    "lib/main.dart",

                  content:
                    currentCode,

                  language:
                    "dart",

                  role:
                    "entrypoint",
                },
              ];
          }
        }
      }

      /* ======================================================
         FALLBACK / ROLLBACK
         ====================================================== */

      /*
       * Production safety net:
       *
       * Never discard a previously working project preview.
       *
       * If the new code still fails after repair,
       * try verified previous project versions.
       */

      if (
        !buildSucceeded &&
        projectId
      ) {
        const fallbackCandidates =
          await loadVerifiedFallbackCandidates(
            projectId,
            rawCode
          );

        for (
          const candidate of
            fallbackCandidates
        ) {
          if (
            this.cancelled.has(
              sessionId
            )
          ) {
            return;
          }

          try {
            const compatibility =
              selfHealingBuild.deterministicRepair(
                candidate.code,
                String(
                  terminalBuildError?.message ||
                    ""
                )
              );

            const fallbackCode =
              sanitizeGeneratedFlutterCode(
                compatibility.updatedCode ||
                  candidate.code
              );

            fs.writeFileSync(
              path.join(
                workspacePath,
                "lib",
                "main.dart"
              ),
              fallbackCode,
              "utf8"
            );

            patchPubspec(
              workspacePath,
              detectExtraPackages(
                fallbackCode
              )
            );

            await this.setStatus(
              sessionId,
              {
                progress:
                  93,

                message:
                  "New version could not be verified. Restoring the last working project version…",

                buildLogs:
                  logs,
              }
            );

            logs =
              appendBounded(
                logs,
                await this.runCommand(
                  sessionId,
                  getFlutterPath(),
                  [
                    "pub",
                    "get",
                  ],
                  {
                    cwd:
                      workspacePath,
                  }
                )
              );

            logs =
              appendBounded(
                logs,
                await this.runCommand(
                  sessionId,
                  getFlutterPath(),
                  [
                    "build",
                    "web",
                    "--release",
                    `--base-href=${baseHref}`,
                  ],
                  {
                    cwd:
                      workspacePath,
                  }
                )
              );

            currentCode =
              fallbackCode;

            currentFiles =
              [
                {
                  path:
                    "lib/main.dart",

                  content:
                    fallbackCode,

                  language:
                    "dart",

                  role:
                    "entrypoint",
                },
              ];

            buildSucceeded =
              true;

            recoveryStrategy =
              candidate.source;

            servedFallbackVersion =
              candidate.version;

            logs =
              appendBounded(
                logs,
                `\n[guardian] recovered preview using ${candidate.source} version ${
                  candidate.version ||
                  "unknown"
                }.\n`
              );

            break;
          } catch (
            fallbackError
          ) {
            logs =
              appendBounded(
                logs,
                `\n[guardian-fallback] ${candidate.source} version ${
                  candidate.version ||
                  "unknown"
                } failed verification: ${
                  fallbackError.message ||
                  fallbackError
                }\n`
              );
          }
        }
      }

      /* ======================================================
         FINAL BUILD FAILURE
         ====================================================== */

      if (
        !buildSucceeded
      ) {
        throw (
          terminalBuildError ||
          new Error(
            "Flutter Web preview could not be verified after automatic repair and project rollback attempts."
          )
        );
      }

      if (
        this.cancelled.has(
          sessionId
        )
      ) {
        return;
      }

      const indexPath =
        path.join(
          artifactPath,
          "index.html"
        );

      if (
        !fs.existsSync(
          indexPath
        )
      ) {
        throw new Error(
          "Flutter build finished but build/web/index.html was not created."
        );
      }

      await markProjectCodeVerified(
        projectId,
        currentCode,
        servedFallbackVersion
      );

      /* ======================================================
         PREVIEW READY
         ====================================================== */

      await this.setStatus(
        sessionId,
        {
          status:
            "ready",

          progress:
            100,

          message:
            recoveryStrategy ===
            "generated-or-repaired"
              ? "Preview ready."
              : "The latest update could not be verified, so VibeApp restored a previously working version automatically.",

          artifactPath,

          previewUrl:
            `/previews/${publicToken}/`,

          buildLogs:
            logs,

          recovered:
            recoveryStrategy !==
            "generated-or-repaired",

          recoveryStrategy,

          servedFallbackVersion,

          completedAt:
            new Date(),
        }
      );
    } catch (
      error
    ) {
      if (
        this.cancelled.has(
          sessionId
        )
      ) {
        return;
      }

      const errorText =
        error?.message ||
        "Unknown preview build error.";

      logs =
        appendBounded(
          logs,
          `\n${errorText}`
        );

      console.error(
        `[web-preview:${sessionId}] build failed:`,
        errorText
      );

      await this.setStatus(
        sessionId,
        {
          status:
            "failed",

          progress:
            100,

          message:
            "Preview build failed. Check the generated code or build logs.",

          buildLogs:
            logs,

          completedAt:
            new Date(),
        }
      );
    }
  }

  /* ==========================================================
     CLEANUP EXPIRED ARTIFACTS
     ========================================================== */

  async cleanupExpiredArtifacts() {
    const now =
      new Date();

    const sessions =
      await WebPreviewSession.find(
        {
          expiresAt: {
            $lte:
              now,
          },

          workspacePath: {
            $ne:
              "",
          },
        }
      )
        .select(
          "sessionId workspacePath"
        )
        .lean();

    for (
      const session of
        sessions
    ) {
      removeDirectorySafe(
        session.workspacePath
      );

      this.cancelled.add(
        session.sessionId
      );
    }

    if (
      sessions.length
    ) {
      await WebPreviewSession.updateMany(
        {
          sessionId: {
            $in:
              sessions.map(
                (item) =>
                  item.sessionId
              ),
          },
        },
        {
          $set: {
            status:
              "expired",

            artifactPath:
              "",

            previewUrl:
              "",

            message:
              "Preview expired.",
          },
        }
      );
    }
  }
}

/* ============================================================
   EXPORT
   ============================================================ */

module.exports =
  new WebPreviewManager();

module.exports.detectExtraPackages =
  detectExtraPackages;

module.exports.patchPubspec =
  patchPubspec;
