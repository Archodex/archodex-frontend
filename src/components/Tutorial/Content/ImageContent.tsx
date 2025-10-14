import React from 'react';

interface ImageContentProps {
  imageSrc: string;
  altText: string;
  children: React.ReactNode;
}

const ImageContent: React.FC<ImageContentProps> = ({ imageSrc, altText, children }) => {
  return (
    <div className="flex gap-4 items-center">
      <img className="w-[150px]" src={imageSrc} alt={altText} />

      <div>{children}</div>
    </div>
  );
};

export default ImageContent;
