import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export const SearchBar = ({ value, onChange, className }: SearchBarProps) => {
  return (
    <div className={cn("px-2 pb-2", className)}>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search chats, handles, and notes"
        leftIcon={<Search className="h-4 w-4" />}
      />
    </div>
  );
};
