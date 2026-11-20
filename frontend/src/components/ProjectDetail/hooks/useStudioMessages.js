import { useState } from "react";

/** Error / success banner state shared by every studio hook. */
export default function useStudioMessages() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const clearMessages = () => {
    setError("");
    setNotice("");
  };

  return { error, notice, setError, setNotice, clearMessages };
}
