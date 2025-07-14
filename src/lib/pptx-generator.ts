"use client";

import pptxgen from "pptxgenjs";

// Define a more specific type for slide content that includes optional image data
export interface SlideWithImage {
  heading: string;
  content: string;
  imagePrompt?: string;
  imageDataUri?: string;
}

// Update GenerateSlideContentOutput to use the new slide type
export interface GenerateSlideContentOutput {
  titleSlide: {
    title: string;
    subtitle: string;
  };
  bodySlides: SlideWithImage[];
}


export interface Template {
  name: string;
  thumbnail: string;
  aiHint: string;
  master: (ppt: pptxgen) => void;
  colors: {
    bg: string;
    text: string;
    primary: string;
    muted: string;
  };
}

const professionalTemplate: Template = {
  name: "Professional",
  thumbnail: "https://placehold.co/160x90.png",
  aiHint: "minimalist abstract",
  colors: {
    bg: "F4F3F4",
    text: "383838",
    primary: "79579F",
    muted: "6c757d",
  },
  master: (ppt: pptxgen) => {
    ppt.defineLayout({ name: "title", width: 10, height: 5.625 });
    ppt.defineLayout({ name: "body", width: 10, height: 5.625 });

    ppt.defineSlideMaster({
      title: "TITLE_SLIDE",
      background: { color: "F4F3F4" },
      objects: [
        { rect: { x: 0, y: 5.1, w: "100%", h: 0.5, fill: { color: "79579F" } } },
        {
          text: {
            text: "SlideForge",
            options: { x: 0.5, y: 5.2, w: "90%", align: "right", color: "FFFFFF", fontSize: 12 },
          },
        },
      ],
    });

    ppt.defineSlideMaster({
      title: "BODY_SLIDE",
      background: { color: "F4F3F4" },
      objects: [
        { rect: { x: 0, y: 0, w: "100%", h: 0.75, fill: { color: "79579F" } } },
        {
          text: {
            text: "SlideForge Presentation",
            options: { x: 0.5, y: 0, w: "90%", h: 0.75, align: "left", color: "FFFFFF", fontSize: 16, bold: true, valign: 'middle' },
          },
        },
      ],
    });
  },
};

const creativeTemplate: Template = {
    name: "Creative",
    thumbnail: "https://placehold.co/160x90.png",
    aiHint: "colorful geometric",
    colors: {
        bg: "1A1A1A",
        text: "FFFFFF",
        primary: "9F5779",
        muted: "CCCCCC",
    },
    master: (ppt: pptxgen) => {
      ppt.defineLayout({ name: "title", width: 10, height: 5.625 });
      ppt.defineLayout({ name: "body", width: 10, height: 5.625 });
  
      ppt.defineSlideMaster({
        title: "TITLE_SLIDE_CREATIVE",
        background: { color: "1A1A1A" },
        objects: [
          { line: { x: 0, y: 2.75, w: "100%", h: 0, line: { color: "9F5779", width: 3 } } },
          { text: { text: "SlideForge", options: { x: 0.5, y: 5.2, w: "90%", align: "right", color: "9F5779", fontSize: 12 }}},
        ],
      });
  
      ppt.defineSlideMaster({
        title: "BODY_SLIDE_CREATIVE",
        background: { color: "1A1A1A" },
        objects: [
          { rect: { x: 0, y: 0, w: "100%", h: 0.75, fill: { color: "9F5779" } } },
          { text: { text: "SlideForge Presentation", options: { x: 0.5, y: 0, w: "90%", h: 0.75, align: "left", color: "FFFFFF", fontSize: 16, bold: true, valign: 'middle' }}},
        ],
      });
    },
};

export const templates: Template[] = [professionalTemplate, creativeTemplate];

export const exportToPptx = (
  content: GenerateSlideContentOutput,
  template: Template,
  authorDetails: { username: string; institution: string; date: string }
) => {
  let ppt = new pptxgen();
  ppt.author = authorDetails.username;
  ppt.company = authorDetails.institution;
  ppt.title = content.titleSlide.title;
  ppt.subject = content.titleSlide.subtitle;

  template.master(ppt);

  const titleMasterName = template.name === "Professional" ? "TITLE_SLIDE" : "TITLE_SLIDE_CREATIVE";
  let titleSlide = ppt.addSlide({ masterName: titleMasterName });
  titleSlide.addText(content.titleSlide.title, {
    x: 0.5, y: 1.5, w: "90%", h: 1, fontSize: 44, bold: true, color: template.colors.text, align: "center",
  });
  titleSlide.addText(content.titleSlide.subtitle, {
    x: 0.5, y: 2.6, w: "90%", h: 0.75, fontSize: 24, color: template.colors.muted, align: "center",
  });
  titleSlide.addText(
    `By ${authorDetails.username}, ${authorDetails.institution}\n${authorDetails.date}`,
    { x: 0.5, y: 4, w: "90%", h: 0.5, fontSize: 14, color: template.colors.muted, align: "center" }
  );

  const bodyMasterName = template.name === "Professional" ? "BODY_SLIDE" : "BODY_SLIDE_CREATIVE";
  content.bodySlides.forEach((slideContent) => {
    let slide = ppt.addSlide({ masterName: bodyMasterName });
    slide.addText(slideContent.heading, {
      x: 0.5, y: 1.0, w: "90%", h: 0.75, fontSize: 28, bold: true, color: template.colors.primary,
    });
    
    const hasImage = !!slideContent.imageDataUri;
    const textWidth = hasImage ? "45%" : "90%";
    const textOptions: pptxgen.TextPropsOptions = {
      x: 0.5, y: 2.0, w: textWidth, h: 3, fontSize: 16, color: template.colors.text, bullet: {type: 'bullet', code: '2022'},
    };
    slide.addText(slideContent.content, textOptions);

    if (hasImage) {
        slide.addImage({
            data: slideContent.imageDataUri,
            x: 5, y: 2.0, w: 4.5, h: 2.53, sizing: { type: 'contain', w: 4.5, h: 2.53 }
        });
    }
  });

  ppt.writeFile({ fileName: `${content.titleSlide.title.replace(/ /g, '_')}.pptx` });
};
