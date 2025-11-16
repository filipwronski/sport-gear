import { Button } from "@/components/ui/button";

export function HeroCTAButtons() {
  const handleStartFree = () => {
    window.location.href = "/auth";
  };

  const handleLearnMore = () => {
    // Scroll to features section
    const featuresSection = document.getElementById("features");
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Button
        size="lg"
        className="text-lg px-8 py-3"
        onClick={handleStartFree}
      >
        Rozpocznij za darmo
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="text-lg px-8 py-3"
        onClick={handleLearnMore}
      >
        Dowiedz się więcej
      </Button>
    </div>
  );
}

export function BottomCTAButton() {
  const handleStartAdventure = () => {
    window.location.href = "/auth";
  };

  return (
    <Button
      size="lg"
      variant="secondary"
      className="text-lg px-8 py-3"
      onClick={handleStartAdventure}
    >
      Rozpocznij swoją przygodę
    </Button>
  );
}
