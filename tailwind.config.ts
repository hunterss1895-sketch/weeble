import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}","./components/**/*.{js,ts,jsx,tsx,mdx}","./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { weeble: { 50:"#eef9ff",100:"#d9f1ff",200:"#bce7ff",300:"#8ed8ff",400:"#59c0ff",500:"#33a1ff",600:"#1a81f5",700:"#1469e1",800:"#1755b6",900:"#19498f",950:"#142d57" } } } },
  plugins: [],
};
export default config;
