// Optional scene metadata for Replit workspace integrations. When the
// workspace's scene controls are enabled for this project, a viewer's click on
// a scene segment scopes their next chat request to that scene's source file.
// Fill one entry per SCENE_DURATIONS key in VideoTemplate.tsx only when a
// skill reference asks for it; otherwise leave the map empty. Scenes missing
// from the map still play and can be jumped to.
//
// Example:
//   export const SCENE_DETAILS: Record<string, SceneDetails> = {
//     open: { title: 'Intro', filePath: 'src/components/video/video_scenes/Scene1.tsx' },
//   };

export interface SceneDetails {
  title: string;
  filePath: string;
}

export const SCENE_DETAILS: Record<string, SceneDetails> = {
  opening: {
    title: 'Un ERP, sept modules',
    filePath: 'src/components/video/video_scenes/Scene1.tsx',
  },
  commercial: {
    title: 'Gestion commerciale',
    filePath: 'src/components/video/video_scenes/Scene2.tsx',
  },
  ecommerce: {
    title: 'E-commerce',
    filePath: 'src/components/video/video_scenes/Scene3.tsx',
  },
  stock: {
    title: 'Gestion de stock',
    filePath: 'src/components/video/video_scenes/Scene4.tsx',
  },
  transport: {
    title: 'Transport',
    filePath: 'src/components/video/video_scenes/Scene5.tsx',
  },
  immobilier: {
    title: 'Immobilier',
    filePath: 'src/components/video/video_scenes/Scene6.tsx',
  },
  presences: {
    title: 'Présences',
    filePath: 'src/components/video/video_scenes/Scene7.tsx',
  },
  payroll: {
    title: 'Paie',
    filePath: 'src/components/video/video_scenes/Scene8.tsx',
  },
  signature: {
    title: 'MAXIMUS ERP',
    filePath: 'src/components/video/video_scenes/Scene9.tsx',
  },
};
