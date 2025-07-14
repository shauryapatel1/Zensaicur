export interface Font {
  name: string;
  className: string;
  description: string;
}

export const fonts: Font[] = [
  {
    name: 'Inter',
    className: 'font-sans',
    description: 'Clean, modern sans-serif (Default)'
  },
  {
    name: 'Poppins',
    className: 'font-display',
    description: 'Geometric sans-serif with a friendly feel'
  },
  {
    name: 'Merriweather',
    className: 'font-merriweather',
    description: 'Classic serif for a traditional journal feel'
  },
  {
    name: 'Montserrat',
    className: 'font-montserrat',
    description: 'Contemporary sans-serif with elegant proportions'
  },
  {
    name: 'Lora',
    className: 'font-lora',
    description: 'Balanced serif with a calligraphic touch'
  },
  {
    name: 'Roboto Mono',
    className: 'font-mono',
    description: 'Monospaced font for a technical feel'
  }
];