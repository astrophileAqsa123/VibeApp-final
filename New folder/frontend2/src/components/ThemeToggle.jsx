import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <FiSun className="theme-icon sun-icon" aria-hidden="true" />
      ) : (
        <FiMoon className="theme-icon moon-icon" aria-hidden="true" />
      )}
    </button>
  );
}
