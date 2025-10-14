import React from 'react';

import { Separator } from './ui/separator';

interface TextSeparatorProps {
  text: string;
}

const TextSeparator: React.FC<TextSeparatorProps> = ({ text }) => (
  <div className="flex relative justify-center my-4">
    <div className="min-w-8 grow-0" />
    <h3 className="font-semibold text-l text-center px-3 bg-background">{text}</h3>
    <div className="min-w-8 grow-0" />
    <Separator className="absolute h-px bg-primary w-full top-1/2 translate-y-1/2 -z-10" />
  </div>
);

export default TextSeparator;
