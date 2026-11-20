const KEYWORDS = new Set([
  'import',
  'class',
  'extends',
  'const',
  'super',
  'void',
  'return',
  'Widget',
  'BuildContext',
  'StatelessWidget',
  'StatefulWidget',
  'State',
  'final',
  'static',
  'new',
  'override',
])

const TYPES = new Set([
  'MaterialApp',
  'ThemeData',
  'Color',
  'Scaffold',
  'AppBar',
  'Text',
  'ListView',
  'TaskTile',
  'Brightness',
  'EdgeInsets',
  'BuildContext',
  'Widget',
  'MyApp',
  'TodoScreen',
])

export function tokenize(line) {
  const parts = []
  const regex = /(@\w+|'[^']*'|"[^"]*"|\b\d+\b|\b[A-Za-z_]\w*\b|[^\s\w]+|\s+)/g
  let match

  while ((match = regex.exec(line)) !== null) {
    const text = match[0]
    let type = null

    if (text.startsWith('@')) type = 'ann'
    else if (text.startsWith("'") || text.startsWith('"')) type = 'str'
    else if (/^\d+$/.test(text)) type = 'num'
    else if (KEYWORDS.has(text)) type = 'kw'
    else if (TYPES.has(text)) type = 'type'

    parts.push({ text, type })
  }

  return parts
}
