import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled beyond 300px
  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Scroll to top handler
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <>
      {isVisible && (
        <Button
          className="fixed bottom-6 right-6 z-50 p-2 rounded-full w-10 h-10 flex items-center justify-center bg-primary hover:bg-primary/90 text-white shadow-lg"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp size={20} />
        </Button>
      )}
    </>
  );
}