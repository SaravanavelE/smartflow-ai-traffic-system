"use client";

import React, { useState } from "react";
import { MessageSquarePlus, MapPin, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface FeedbackDialogProps {
  onOpenInline?: () => void;
  inline?: boolean;
  onClose?: () => void;
}

export function FeedbackDialog({ onOpenInline, inline = false, onClose }: FeedbackDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [location, setLocation] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inline) {
      onClose?.();
    } else {
      setIsOpen(false);
    }
    toast({
      title: "Feedback Submitted",
      description: `Report at ${location || "current location"} received. AI is recalculating routes.`,
    });
    setFeedback("");
    setLocation("");
  };

  const content = (
    <div className={cn("flex flex-col gap-6", inline && "bg-secondary/30 p-8 rounded-3xl border border-border shadow-2xl")}>
       <div className="flex flex-col gap-1">
          {inline ? (
            <h2 className="font-bold font-headline text-3xl">Traffic Report</h2>
          ) : (
            <DialogTitle className="text-xl font-bold font-headline text-left">Traffic Report</DialogTitle>
          )}
          {inline ? (
            <p className="text-muted-foreground text-sm">
              Share real-time updates to help SmartFlow optimize everyone's commute.
            </p>
          ) : (
            <DialogDescription className="text-left">
              Share real-time updates to help SmartFlow optimize everyone's commute.
            </DialogDescription>
          )}
       </div>
        
       <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-2">
          <div className="flex flex-col gap-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Incident Type</Label>
            <RadioGroup defaultValue="congestion" className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2 p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                <RadioGroupItem value="congestion" id="congestion" />
                <Label htmlFor="congestion" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <AlertTriangle className="h-4 w-4 text-orange-500" /> Congestion
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                <RadioGroupItem value="accident" id="accident" />
                <Label htmlFor="accident" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <AlertTriangle className="h-4 w-4 text-red-500" /> Accident
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                <RadioGroupItem value="signal" id="signal" />
                <Label htmlFor="signal" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Info className="h-4 w-4 text-accent" /> Signal Issue
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors">
                <RadioGroupItem value="roadwork" id="roadwork" />
                <Label htmlFor="roadwork" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Info className="h-4 w-4 text-yellow-500" /> Roadwork
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Incident Location</Label>
            <div className="relative group">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-accent group-focus-within:animate-pulse" />
              <Input 
                placeholder="e.g. Gandhipuram Junction (Leave empty for current location)" 
                className="pl-10 bg-background border-border focus:border-accent text-sm"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea 
              placeholder="Tell us more (e.g., 'Flooding near Gemini Flyover'..." 
              className="bg-background border-border focus:border-accent min-h-[100px] text-sm"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full h-12 bg-accent text-accent-foreground font-bold hover:bg-accent/90 glow-accent transition-all">
            Submit Report
          </Button>
       </form>
    </div>
  );

  if (inline) return content;

  if (onOpenInline) {
    return (
      <Button 
        variant="outline" 
        onClick={onOpenInline}
        className="w-full h-12 gap-3 bg-secondary/50 border-border hover:bg-secondary hover:border-accent/50 text-sm font-semibold transition-all"
      >
        <MessageSquarePlus className="h-5 w-5 text-accent" />
        Report Incident
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full h-12 gap-3 bg-secondary/50 border-border hover:bg-secondary hover:border-accent/50 text-sm font-semibold transition-all"
        >
          <MessageSquarePlus className="h-5 w-5 text-accent" />
          Report Incident
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-background border-border sm:max-w-[425px]">
         {content}
      </DialogContent>
    </Dialog>
  );
}