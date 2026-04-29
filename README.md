# Portfolio Repository

A modern, high-performance personal portfolio built with cutting-edge web technologies. Features smooth scrolling, dynamic animations, and internationalization.

## 🚀 Tech Stack 

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Smooth Scrolling**: [Lenis](https://github.com/studio-freight/lenis)
- **Internationalization**: [next-intl](https://next-intl-docs.vercel.app/)
- **Language**: TypeScript

## 🛡️ Git & Repository Safety

This repository has been professionally configured to ensure complete safety, prevent bloat, and avoid accidental secrets leakage.

### 1. The Comprehensive `.gitignore`
The `.gitignore` file has been meticulously structured to automatically ignore:
- **Build Artifacts & Cache:** The entire `/.next/` directory, `/out/`, `/build/`, and `*.tsbuildinfo` files. This prevents bloated repository histories and massive push/pull times.
- **Node Dependencies:** `/node_modules`, `/.pnp`, and related package manager states.
- **Secrets & Environment Variables:** Strict ignores for `.env`, `.env.local`, `.env.development.local`, `.env.test.local`, and `.env.production.local` ensure that no API keys or local secrets are ever accidentally committed.
- **OS & IDE Junk:** Automatically ignores Windows (`Thumbs.db`), macOS (`.DS_Store`), and IDE configuration files (`.vscode`, `.idea`), keeping the codebase clean regardless of the developer's machine.

*(Note: The previously tracked `.next` build files have been safely untracked and purged from the git index to restore repo hygiene.)*

### 2. The `.gitattributes` Configuration
A strict `.gitattributes` file has been implemented to guarantee cross-platform consistency:
- **Line Endings (CRLF vs LF):** Enforces `LF` line endings across all text files (`.js`, `.ts`, `.tsx`, `.css`, etc.). This eliminates the "every line modified" git diff noise that occurs when developers collaborate across Windows and macOS/Linux.
- **Binary File Handling:** Explicitly marks image and font assets (`.png`, `.webp`, `.avif`, `.woff2`, etc.) as binary, preventing Git from accidentally attempting text-based merges or line-ending conversions on them, which would corrupt the files.

## 💻 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run the Development Server**
   ```bash
   npm run dev
   ```

3. **Build for Production**
   ```bash
   npm run build
   npm run start
   ```

## 🖼️ Asset Optimization
An included script is available to optimize images before deployment. 
Run: `npm run optimize`
