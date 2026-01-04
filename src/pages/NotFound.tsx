import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center max-w-md animate-fade-in">
        {/* Illustration */}
        <div className="relative mb-8">
          <div className="text-[10rem] font-bold text-muted-foreground/10 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
              <Search className="h-12 w-12 text-primary" />
            </div>
          </div>
        </div>

        {/* Content */}
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Page not found
        </h1>
        <p className="text-muted-foreground mb-8">
          Sorry, we couldn't find the page you're looking for. 
          It might have been moved or doesn't exist.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="outline" onClick={() => window.history.back()} aria-label="Go back to previous page">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button asChild aria-label="Return to dashboard">
            <Link to="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Path info */}
        <p className="text-xs text-muted-foreground mt-8">
          Attempted path: <code className="bg-muted px-2 py-1 rounded">{location.pathname}</code>
        </p>
      </div>
    </div>
  );
};

export default NotFound;