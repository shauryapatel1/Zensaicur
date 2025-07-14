import { Link } from "react-router-dom";
import { APP_NAME, APP_TAGLINE } from "../constants/uiStrings";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zen-cream/60 dark:bg-gray-800/60 backdrop-blur py-4">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between">
        <p className="font-medium">
          © {currentYear} {APP_NAME} • {APP_TAGLINE}
        </p>

        <nav className="flex gap-6 flex-wrap justify-center">
          <Link
            to="/privacy"
            className="text-zen-sage-600/70 hover:text-zen-sage-800 transition-colors"
          >
            Privacy
          </Link>
          <Link
            to="/terms"
            className="text-zen-sage-600/70 hover:text-zen-sage-800 transition-colors"
          >
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}