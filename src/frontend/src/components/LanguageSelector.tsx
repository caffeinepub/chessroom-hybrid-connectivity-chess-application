import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Language, languageNames } from "@/lib/translations";
import { Globe } from "lucide-react";

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
}

export default function LanguageSelector({
  currentLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const languages: Language[] = [
    "tr",
    "en",
    "zh-CN",
    "es",
    "hi",
    "ar",
    "pt",
    "fr",
    "ru",
    "ja",
    "de",
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-2 border-white/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-white"
        >
          <Globe className="w-5 h-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-gradient-to-br from-blue-600 to-purple-600 border-2 border-white/30 shadow-2xl backdrop-blur-sm mt-2 mx-2 sm:mx-0"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`cursor-pointer font-semibold text-white hover:bg-white/20 transition-colors ${
              currentLanguage === lang ? "bg-white/30" : ""
            }`}
          >
            {languageNames[lang]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
