import type { SocialLink } from "@/types/terminal";

// Command text content
export const COMMAND_TEXTS = {
  help: `<pre class="help">
Hi there! I'm Derenik, welcome to my own commandline interface website, 
these are common commands used in various situations:

      about         Show information about me
      
      clear         Clear the screen
      
      connect       Connect with me
      
      help          Show all the commands
      
      marvel        Say hello to marvel
      
      starwars      Say hello to Star Wars
      
      mirror        ASCII camera mirror with variants (--v1, --v2, --v3)</pre>`,

  about: `I'm a Lead Frontend Engineer who sees interfaces as living systems — a bridge between logic and emotion. Over the years, I've led teams and built products that don't just work fast — they feel fast. My craft revolves around creating cohesive, resilient architectures that empower both users and developers.

My focus is on clarity, scalability, and experience — shaping design systems, defining frontend workflows, and mentoring engineers to think beyond implementation. I believe great frontend engineering is equal parts science and story: every pixel, every transition, every state update has a rhythm.

I've led multiple teams through transitions — from legacy React apps to modern Next.js and TypeScript ecosystems, built shared UI libraries that scale across microfrontends, and introduced structured feature-definition processes that turned chaotic ideas into deliverable reality.

When I code, I blend performance with poetry — clean structure, test-driven flow, and an instinct for what feels right.
When I lead, I focus on people — creating alignment, rhythm, and space for creativity.

I don't just build apps.
I build systems that outlast trends and teams that outgrow limitations.`,

  contact: `You may contact with me via my e-mail address deren.kha@gmail.com, or using some social networks. Just type "connect --{network}", for example "connect --telegram". 
  <pre>
  This is a list of available communication channels:
    
    --github
    
    --telegram

    --linkedin
  </pre>`,

//   resume: `I'm working as a fullstack JavaScript developer with tremendous breadth experience in development single-page applications, responsive websites and Android/iOS mobile applications

// Client-side programming: HTML, CSS, JavaScript, React, Redux
// Server-side programming: Node.js, Express, GraphQL
// Mobile development: Cordova, React Native
// Document database: MongoDB
// Server-side administration: Heroku, Linux, Nginx
// Project-management: Git flow
// Other: Bot development (Telegram, Slack, FaceBook Messenger, etc.)

// In my work I use the most advanced and high performance technologies like React.js library for building user interfaces, Redux for managing state of the application, Babel transplier for ensure the functionality of the application on various platforms. Also, I'm writing maintainable code

// I follow TDD methodology in order to ensure the stability of the application using Jest testing framework.

// I use Vim editor for development and work from an ArchLinux enviorenment`,

  notFound: " command not found",
} as const;

// Social media links
export const SOCIAL_LINKS: SocialLink[] = [
  {
    name: "GitHub",
    url: "https://github.com/b4rb13",
    command: "connect --github",
  },
  {
    name: "Telegram",
    url: "https://t.me/derkhachatryan",
    command: "connect --telegram",
  },
  {
    name: "LinkedIn",
    url: "https://linkedin.com/in/derenik-khachatryan/",
    command: "connect --linkedin",
  },
  // {
  //   name: 'Twitter',
  //   url: 'https://twitter.com/__b4rb13',
  //   command: 'connect --twitter'
  // }
];

// Audio files configuration
export const AUDIO_FILES = [
  {
    name: "starwars",
    src: "/audio/sw.mp3",
    preload: false,
  },
  {
    name: "marvel",
    src: "/audio/av.mp3",
    preload: false,
  },
];
