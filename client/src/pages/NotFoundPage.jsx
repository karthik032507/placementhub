import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="notfound">
      <div>
        <h1>404</h1>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Page not found</h2>
        <p className="text-muted mt-2">The page you are looking for does not exist or has moved.</p>
        <Link to="/companies" className="btn btn-accent mt-6">
          Go to Companies
        </Link>
      </div>
    </div>
  );
}
