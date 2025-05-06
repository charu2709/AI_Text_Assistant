
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { generateInitialText } from '@/ai/flows/generate-initial-text';
import { summarizeText } from '@/ai/flows/summarize-text';
import { improveText } from '@/ai/flows/improve-text';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Volume2, VolumeX, Info } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


type ActiveTab = 'generate' | 'summarize' | 'improve';

const storyThemes = [
  { value: 'horror', label: 'Horror' },
  { value: 'funny', label: 'Funny' },
  { value: 'folk tale', label: 'Folk Tale' },
  { value: 'sci-fi', label: 'Sci-Fi' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'romance', label: 'Romance' },
  { value: 'adventure', label: 'Adventure' },
];

const NO_THEME_VALUE = "none";

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [textToSummarize, setTextToSummarize] = useState('');
  const [textToImprove, setTextToImprove] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [summary, setSummary] = useState('');
  const [improvedTextState, setImprovedTextState] = useState(''); // Renamed to avoid conflict
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('generate');
  
  // General Parameters
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([250]);
  const [topP, setTopP] = useState([0.9]);

  // Generate-specific Parameters
  const [presencePenalty, setPresencePenalty] = useState([0.0]);
  const [frequencyPenalty, setFrequencyPenalty] = useState([0.0]);
  const [seed, setSeed] = useState<string>('');
  
  const [selectedTheme, setSelectedTheme] = useState<string>('');


  const { toast } = useToast();
  const speechSynthesis = typeof window !== 'undefined' ? window.speechSynthesis : null;
  const utterance = typeof window !== 'undefined' ? new SpeechSynthesisUtterance() : null;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (speechSynthesis) {
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices);
          if (utterance && availableVoices.length > 0) {
            let selectedVoice = availableVoices.find(voice => voice.localService && voice.lang.startsWith('en'));
            if (!selectedVoice) {
              selectedVoice = availableVoices.find(voice => voice.lang.startsWith('en'));
            }
            utterance.voice = selectedVoice || availableVoices[0];
          }
        }
      };

      loadVoices();
      speechSynthesis.onvoiceschanged = loadVoices; 

      return () => {
        speechSynthesis.onvoiceschanged = null;
        if (speechSynthesis.speaking) {
          speechSynthesis.cancel();
        }
      };
    }
  }, [speechSynthesis, utterance]);


  const handleSpeak = useCallback(() => {
    if (!speechSynthesis || !utterance) {
      toast({
        title: "Speech Error",
        description: "Speech synthesis is not supported or initialized in your browser.",
        variant: "destructive",
      });
      return;
    }

    let textToSpeak = '';
    if (activeTab === 'generate' && generatedText) textToSpeak = generatedText;
    else if (activeTab === 'summarize' && summary) textToSpeak = summary;
    else if (activeTab === 'improve' && improvedTextState) textToSpeak = improvedTextState;

    if (!textToSpeak.trim()) {
      toast({
        title: "Nothing to Speak",
        description: "There is no text to speak.",
        variant: "destructive",
      });
      return;
    }

    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      utterance.text = textToSpeak;
      if (!utterance.voice && voices.length > 0) {
        utterance.voice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      } else if (!utterance.voice && voices.length === 0) {
         toast({
           title: "Voice Error",
           description: "No speech synthesis voices available.",
           variant: "destructive",
         });
         return;
      }

      speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
        toast({
          title: "Speech Error",
          description: `Could not play audio: ${event.error}`,
          variant: "destructive",
        });
        setIsSpeaking(false);
      };
    }
  }, [speechSynthesis, utterance, generatedText, summary, improvedTextState, activeTab, toast, voices]);


  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt before generating text.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedText('');

    let fullPrompt = prompt;
    if (selectedTheme && selectedTheme !== NO_THEME_VALUE) {
      const themeLabel = storyThemes.find(t => t.value === selectedTheme)?.label || selectedTheme;
      fullPrompt = `Generate a ${themeLabel.toLowerCase()} story about: ${prompt}`;
    }

    try {
      let parsedSeed: number | undefined = undefined;
      if (seed.trim() !== '') {
        const numSeed = Number(seed);
        if (!Number.isInteger(numSeed)) {
            toast({
                title: "Invalid Seed",
                description: "Seed must be a whole number (integer).",
                variant: "destructive",
            });
            setIsLoading(false);
            return;
        }
        parsedSeed = numSeed;
      }


      const result = await generateInitialText({ 
        prompt: fullPrompt, 
        temperature: temperature[0],
        maxTokens: maxTokens[0],
        topP: topP[0],
        presencePenalty: presencePenalty[0],
        frequencyPenalty: frequencyPenalty[0],
        seed: parsedSeed,
      });
      setGeneratedText(result.generatedText);
    } catch (error) {
      console.error('Error generating text:', error);
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!textToSummarize.trim()) {
      toast({
        title: "Text Required",
        description: "Please enter text to summarize.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setSummary('');
    try {
      const result = await summarizeText({ 
        text: textToSummarize, 
        temperature: temperature[0],
        maxTokens: maxTokens[0],
        topP: topP[0],
      });
      setSummary(result.summary);
    } catch (error) {
      console.error('Error summarizing text:', error);
      toast({
        title: "Summarization Failed",
        description: "An error occurred while summarizing text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!textToImprove.trim()) {
      toast({
        title: "Text Required",
        description: "Please enter text to improve.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    setImprovedTextState('');
    try {
      const result = await improveText({ 
        text: textToImprove, 
        temperature: temperature[0],
        maxTokens: maxTokens[0],
        topP: topP[0],
      });
      setImprovedTextState(result.improvedText);
    } catch (error)
     {
      console.error('Error improving text:', error);
      toast({
        title: "Improvement Failed",
        description: "An error occurred while improving text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const getOutputText = () => {
    if (activeTab === 'generate') return generatedText;
    if (activeTab === 'summarize') return summary;
    if (activeTab === 'improve') return improvedTextState;
    return '';
  }

  const ParameterSlider = ({
    id,
    label,
    value,
    onValueChange,
    min,
    max,
    step,
    description,
    disabled,
    displayValueSuffix = ''
  }: {
    id: string;
    label: string;
    value: number[];
    onValueChange: (value: number[]) => void;
    min: number;
    max: number;
    step: number;
    description: string;
    disabled: boolean;
    displayValueSuffix?: string;
  }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between">
            <Label htmlFor={id} className="text-sm font-medium">
            {label}: {value[0].toFixed(step === 0.1 || step === 0.01 ? (step === 0.01 ? 2: 1) : 0)}{displayValueSuffix}
            </Label>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                        <p>{description}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        <Slider
            id={id}
            min={min}
            max={max}
            step={step}
            value={value}
            onValueChange={onValueChange}
            className="w-full"
            disabled={disabled}
            aria-label={label}
        />
    </div>
);


  return (
    <TooltipProvider>
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardDescription>Explore different GenAI text features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate Story</TabsTrigger>
              <TabsTrigger value="summarize">Summarize Text</TabsTrigger>
              <TabsTrigger value="improve">Improve Text</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-sm font-medium">Enter your story prompt:</Label>
                  <Textarea
                    id="prompt"
                    placeholder="e.g., A lonely astronaut finds an alien pet on Mars..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[100px] resize-none"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storyTheme" className="text-sm font-medium">Select Story Theme (Optional):</Label>
                  <Select
                    value={selectedTheme || NO_THEME_VALUE}
                    onValueChange={(value) => setSelectedTheme(value === NO_THEME_VALUE ? '' : value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="storyTheme" className="w-full">
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_THEME_VALUE}>None (General)</SelectItem>
                      {storyThemes.map(theme => (
                        <SelectItem key={theme.value} value={theme.value}>
                          {theme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ParameterSlider id="temperature-generate" label="Temperature" value={temperature} onValueChange={setTemperature} min={0} max={1} step={0.1} description="Controls randomness. Lower values (e.g., 0.2) make the output more focused. Higher values (e.g., 0.8) make it more creative." disabled={isLoading} />
                    <ParameterSlider id="maxTokens-generate" label="Max Tokens" value={maxTokens} onValueChange={setMaxTokens} min={50} max={1000} step={10} description="Maximum number of tokens (roughly words) for the story." disabled={isLoading} />
                    <ParameterSlider id="topP-generate" label="Top-P" value={topP} onValueChange={setTopP} min={0.1} max={1} step={0.1} description="Controls diversity by probability mass. (e.g. 0.9 means consider top 90% probable tokens)." disabled={isLoading} />
                    <ParameterSlider id="presencePenalty-generate" label="Presence Penalty" value={presencePenalty} onValueChange={setPresencePenalty} min={-2.0} max={2.0} step={0.1} description="Positive values encourage new topics. Negative values encourage sticking to existing topics." disabled={isLoading} />
                    <ParameterSlider id="frequencyPenalty-generate" label="Frequency Penalty" value={frequencyPenalty} onValueChange={setFrequencyPenalty} min={-2.0} max={2.0} step={0.1} description="Positive values penalize repeated words/phrases. Negative values allow natural repetition." disabled={isLoading} />
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="seed" className="text-sm font-medium">Seed (for reproducibility)</Label>
                             <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                        <p>An integer seed for random number generation. Using the same seed and prompt will produce the same output.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <Input 
                            id="seed" 
                            type="number"
                            placeholder="e.g. 42 (integer only)" 
                            value={seed} 
                            onChange={(e) => setSeed(e.target.value)} 
                            disabled={isLoading} 
                        />
                    </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="summarize" className="mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="textToSummarize" className="text-sm font-medium">Enter text to summarize:</Label>
                  <Textarea
                    id="textToSummarize"
                    placeholder="Paste your long text here..."
                    value={textToSummarize}
                    onChange={(e) => setTextToSummarize(e.target.value)}
                    className="min-h-[150px] resize-none"
                    disabled={isLoading}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ParameterSlider id="temperature-summarize" label="Temperature" value={temperature} onValueChange={setTemperature} min={0} max={1} step={0.1} description="Controls abstraction. Lower values (e.g., 0.2) produce more literal summaries. Higher values (e.g., 0.8) allow for more abstract summarization." disabled={isLoading} />
                    <ParameterSlider id="maxTokens-summarize" label="Max Tokens" value={maxTokens} onValueChange={setMaxTokens} min={20} max={500} step={10} description="Maximum number of tokens for the summary." disabled={isLoading} />
                    <ParameterSlider id="topP-summarize" label="Top-P" value={topP} onValueChange={setTopP} min={0.1} max={1} step={0.1} description="Controls diversity for the summary." disabled={isLoading} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="improve" className="mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="textToImprove" className="text-sm font-medium">Enter text to improve:</Label>
                  <Textarea
                    id="textToImprove"
                    placeholder="Paste text you want to refine..."
                    value={textToImprove}
                    onChange={(e) => setTextToImprove(e.target.value)}
                    className="min-h-[150px] resize-none"
                    disabled={isLoading}
                  />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ParameterSlider id="temperature-improve" label="Temperature" value={temperature} onValueChange={setTemperature} min={0} max={1} step={0.1} description="Controls creativity of improvements. Lower values (e.g., 0.2) suggest minor edits. Higher values (e.g., 0.8) may suggest more significant rephrasing." disabled={isLoading} />
                    <ParameterSlider id="maxTokens-improve" label="Max Tokens" value={maxTokens} onValueChange={setMaxTokens} min={50} max={1000} step={10} description="Maximum number of tokens for the improved text." disabled={isLoading} />
                    <ParameterSlider id="topP-improve" label="Top-P" value={topP} onValueChange={setTopP} min={0.1} max={1} step={0.1} description="Controls diversity for the improved text." disabled={isLoading} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="output" className="text-sm font-medium">
                {activeTab === 'generate' && 'Generated Story:'}
                {activeTab === 'summarize' && 'Summary:'}
                {activeTab === 'improve' && 'Improved Text:'}
              </Label>
              {getOutputText() && (
                <Button variant="ghost" size="icon" onClick={handleSpeak} disabled={!speechSynthesis || voices.length === 0 || isLoading} aria-label={isSpeaking ? "Stop speaking" : "Speak text"}>
                  {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              )}
            </div>
            <div className="relative min-h-[250px] w-full rounded-md border border-input bg-secondary/50 p-6 text-base shadow-inner">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                  <span className="ml-2 text-muted-foreground">
                    {activeTab === 'generate' && 'Generating your story...'}
                    {activeTab === 'summarize' && 'Summarizing text...'}
                    {activeTab === 'improve' && 'Improving text...'}
                  </span>
                </div>
              )}
              <pre className="whitespace-pre-wrap break-words font-sans leading-relaxed text-justify">
                {getOutputText() ? (
                  getOutputText()
                ) : !isLoading ? (
                  <span className="text-muted-foreground italic">
                    {activeTab === 'generate' && 'Your generated story will appear here...'}
                    {activeTab === 'summarize' && 'Your summary will appear here...'}
                    {activeTab === 'improve' && 'Your improved text will appear here...'}
                  </span>
                ) : null}
              </pre>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            onClick={
              activeTab === 'generate' ? handleGenerate :
              activeTab === 'summarize' ? handleSummarize : handleImprove
            }
            disabled={isLoading}
            className="bg-accent hover:bg-accent/90 text-accent-foreground w-full sm:w-auto transition-colors duration-200 px-8 py-3 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {activeTab === 'generate' && 'Generating...'}
                {activeTab === 'summarize' && 'Summarizing...'}
                {activeTab === 'improve' && 'Improving...'}
              </>
            ) : (
              activeTab === 'generate' ? 'Generate Story' :
              activeTab === 'summarize' ? 'Summarize Text' : 'Improve Text'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
    </TooltipProvider>
  );
}

    
