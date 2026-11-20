import { CATEGORIES } from "./constants";
import "./CategoryChips.css";

export default function CategoryChips({ selected, onSelect }) {
  return (
    <div className="templates-categories">
      {CATEGORIES.map((cat) => {
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            className={`templates-cat-chip ${isActive ? "active" : ""}`}
            onClick={() => onSelect(cat.id)}
          >
            <span className="cat-icon">{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}
