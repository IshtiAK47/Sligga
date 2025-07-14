"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from 'next/image';
import {
  generateSlideContent,
  type GenerateSlideContentOutput,
} from "@/ai/flows/generate-slide-content";
import { generateImage } from "@/ai/flows/generate-image";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Wand2,
  Download,
  ArrowLeft,
  ArrowRight,
  Palette,
  Pencil,
  Presentation,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { exportToPptx, templates, type Template } from "@/lib/pptx-generator";
import { EditableField } from "@/components/editable-field";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters."),
  institution: z.string().min(2, "Institution must be at least 2 characters."),
  presentationDate: z.string().min(1, "Date is required."),
  topic: z.string().min(5, "Topic must be at least 5 characters."),
  slideCount: z.coerce
    .number()
    .int()
    .min(1, "At least 1 slide is required.")
    .max(10, "Maximum 10 slides."),
});

type FormValues = z.infer<typeof formSchema>;
type SlideWithImage = GenerateSlideContentOutput["bodySlides"][number] & {
  imageDataUri?: string;
  isGeneratingImage?: boolean;
};
type ContentWithImages = Omit<GenerateSlideContentOutput, "bodySlides"> & {
  bodySlides: SlideWithImage[];
};

export default function SlideGeneratorPage() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [generatedContent, setGeneratedContent] =
    useState<ContentWithImages | null>(null);
  const [formValues, setFormValues] = useState<FormValues | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(
    templates[0]
  );
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      institution: "",
      presentationDate: new Date().toISOString().split("T")[0],
      topic: "",
      slideCount: 3,
    },
  });

  const onSubmit = (values: FormValues) => {
    setFormValues(values);
    setGeneratedContent(null);
    startTransition(async () => {
      try {
        const result = await generateSlideContent(values);
        const contentWithImageState: ContentWithImages = {
          ...result,
          bodySlides: result.bodySlides.map((slide) => ({
            ...slide,
            imageDataUri: undefined,
            isGeneratingImage: false,
          })),
        };
        setGeneratedContent(contentWithImageState);
        
        // Kick off image generation after content is set
        result.bodySlides.forEach((slide, index) => {
          if (slide.imagePrompt) {
            generateSlideImage(index, slide.imagePrompt);
          }
        });

      } catch (error) {
        console.error("Error generating slide content:", error);
        toast({
          title: "Error",
          description: "Failed to generate presentation. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const generateSlideImage = useCallback(async (index: number, prompt: string) => {
    setGeneratedContent((prev) => {
      if (!prev) return null;
      const newSlides = [...prev.bodySlides];
      newSlides[index].isGeneratingImage = true;
      return { ...prev, bodySlides: newSlides };
    });

    try {
      const { imageDataUri } = await generateImage({ prompt });
      setGeneratedContent((prev) => {
        if (!prev) return null;
        const newSlides = [...prev.bodySlides];
        newSlides[index].imageDataUri = imageDataUri;
        newSlides[index].isGeneratingImage = false;
        return { ...prev, bodySlides: newSlides };
      });
    } catch (error) {
       console.error(`Error generating image for slide ${index}:`, error);
       toast({
         title: "Image Generation Error",
         description: `Could not create an image for: "${prompt.substring(0,50)}..."`,
         variant: "destructive",
       });
       setGeneratedContent((prev) => {
        if (!prev) return null;
        const newSlides = [...prev.bodySlides];
        newSlides[index].isGeneratingImage = false;
        return { ...prev, bodySlides: newSlides };
      });
    }
  }, [toast]);

  const handleSlideContentChange = (
    index: number,
    field: "heading" | "content",
    newValue: string
  ) => {
    if (!generatedContent) return;
    const newSlides = [...generatedContent.bodySlides];
    newSlides[index] = { ...newSlides[index], [field]: newValue };
    setGeneratedContent({ ...generatedContent, bodySlides: newSlides });
  };

  const handleTitleSlideChange = (
    field: "title" | "subtitle",
    newValue: string
  ) => {
    if (!generatedContent) return;
    const newTitleSlide = { ...generatedContent.titleSlide, [field]: newValue };
    setGeneratedContent({ ...generatedContent, titleSlide: newTitleSlide });
  };

  const handleDownload = () => {
    if (!generatedContent || !formValues) return;
    exportToPptx(
      generatedContent,
      selectedTemplate,
      {
        username: formValues.username,
        institution: formValues.institution,
        date: formValues.presentationDate,
      }
    );
  };

  const startOver = () => {
    setGeneratedContent(null);
    form.reset();
  };

  const slidePreviewClasses = cn(
    "aspect-[16/9] w-full rounded-lg shadow-lg flex flex-col p-8 transition-colors duration-300",
    {
      "bg-white text-gray-800": selectedTemplate.name === "Professional",
      "bg-gray-900 text-white": selectedTemplate.name === "Creative",
    }
  );

  const headingClasses = cn("font-bold", {
    "text-primary": selectedTemplate.name === "Professional",
    "text-primary": selectedTemplate.name === "Creative", // Uses dark mode primary
  });
  
  const renderBodySlide = (slide: SlideWithImage, index: number) => {
    const hasImage = !!slide.imagePrompt;

    return (
      <div className={cn(slidePreviewClasses, 'p-6')}>
        <EditableField
          initialValue={slide.heading}
          onSave={(v) => handleSlideContentChange(index, "heading", v)}
          viewAs="h3"
          className={cn(headingClasses, "text-3xl mb-4")}
        />
        <div className={cn("flex-1 grid gap-4", hasImage ? "grid-cols-2" : "grid-cols-1")}>
          <EditableField
            initialValue={slide.content}
            onSave={(v) => handleSlideContentChange(index, "content", v)}
            isTextarea
            className="text-base"
          />
          {hasImage && (
            <div className="flex flex-col items-center justify-center gap-2">
              {slide.isGeneratingImage && (
                <div className="w-full aspect-video bg-muted rounded-md flex flex-col items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Generating image...</p>
                </div>
              )}
              {!slide.isGeneratingImage && slide.imageDataUri && (
                <>
                  <Image
                    src={slide.imageDataUri}
                    alt={slide.imagePrompt || "Generated image"}
                    width={400}
                    height={225}
                    className="rounded-md object-cover aspect-video"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateSlideImage(index, slide.imagePrompt!)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                </>
              )}
               {!slide.isGeneratingImage && !slide.imageDataUri && (
                 <div className="w-full aspect-video bg-muted/50 border-2 border-dashed rounded-md flex flex-col items-center justify-center text-center p-4">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">Could not generate image.</p>
                     <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        onClick={() => generateSlideImage(index, slide.imagePrompt!)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                      </Button>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    );
  };


  if (isPending && !generatedContent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Wand2 className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Generating your masterpiece...
            </CardTitle>
            <CardDescription>
              Our AI is crafting your presentation. This might take a moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="flex justify-center space-x-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (generatedContent) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="p-4 border-b flex justify-between items-center bg-card">
          <div className="flex items-center gap-2">
            <Presentation className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Sligga</h1>
          </div>
          <Button onClick={startOver} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Start Over
          </Button>
        </header>

        <main className="flex-1 grid md:grid-cols-[320px_1fr] gap-4 p-4 lg:p-8">
          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" /> Templates
                </CardTitle>
                <CardDescription>Choose a style for your presentation.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.name}>
                    <button
                      onClick={() => setSelectedTemplate(template)}
                      className={cn(
                        "rounded-lg border-2 p-1 transition-all",
                        selectedTemplate.name === template.name
                          ? "border-primary ring-2 ring-primary"
                          : "border-transparent"
                      )}
                    >
                      <Image
                        src={template.thumbnail}
                        alt={template.name}
                        width={160}
                        height={90}
                        className="rounded-md"
                        data-ai-hint={template.aiHint}
                      />
                    </button>
                    <p className="text-center text-sm mt-2">{template.name}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" /> Download
                </CardTitle>
                <CardDescription>Export your finished presentation.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleDownload} className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Download as PPTX
                </Button>
              </CardContent>
            </Card>
          </aside>

          <div className="flex flex-col items-center justify-center">
            <Carousel setApi={setCarouselApi} className="w-full max-w-3xl">
              <CarouselContent>
                <CarouselItem>
                  <div className={cn(slidePreviewClasses, 'justify-center items-center')}>
                    <EditableField
                      initialValue={generatedContent.titleSlide.title}
                      onSave={(v) => handleTitleSlideChange("title", v)}
                      viewAs="h1"
                      className={cn(headingClasses, "text-4xl text-center mb-4")}
                    />
                    <EditableField
                      initialValue={generatedContent.titleSlide.subtitle}
                      onSave={(v) => handleTitleSlideChange("subtitle", v)}
                      viewAs="h2"
                      className="text-2xl text-center text-muted-foreground mb-8"
                    />
                  </div>
                </CarouselItem>

                {generatedContent.bodySlides.map((slide, index) => (
                  <CarouselItem key={index}>
                    {renderBodySlide(slide, index)}
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            <div className="py-2 text-center text-sm text-muted-foreground">
              Slide {currentSlide + 1} of {generatedContent.bodySlides.length + 1}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
             <Presentation className="h-12 w-12 text-primary"/>
          </div>
          <CardTitle className="text-3xl font-bold">Sligga</CardTitle>
          <CardDescription>
            Tell us about your presentation, and we'll craft the slides for you.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="institution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Institution</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme University" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="presentationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Presentation Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slideCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Slides</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="topic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Presentation Topic</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. The Future of Renewable Energy"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Slides
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
