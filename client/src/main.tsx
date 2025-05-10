import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { Helmet, HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "@/components/theme-provider";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <Helmet>
      <title>GoalQuest - Achieve More</title>
      <meta name="description" content="Track, achieve, and celebrate your goals with GoalQuest" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    </Helmet>
    <ThemeProvider defaultTheme="system" storageKey="goalquest-theme">
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
