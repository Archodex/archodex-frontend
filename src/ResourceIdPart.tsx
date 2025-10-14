import React from 'react';
import { Copy } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
import { Button } from './components/ui/button';
import ResourceLink from './components/ResourceLink';
import { labelForResourceType } from './lib/utils';

interface ResourceIdProps {
  id: ResourceId;
}

const ResourceIdPart: React.FC<ResourceIdProps> = ({ id }) => {
  const idPart = id[id.length - 1];

  return (
    <>
      <div className="grid">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <h5 className="italic text-left truncate">{labelForResourceType(idPart.type)}</h5>
            </TooltipTrigger>
            <TooltipContent>
              <p>{labelForResourceType(idPart.type)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger className="overflow-hidden grow">
              <ResourceLink className="block text-left truncate px-4 font-semibold select-text" id={id} />
            </TooltipTrigger>
            <TooltipContent>
              <p>{idPart.id}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(idPart.id).catch((err: unknown) => {
              console.error('Failed to copy resource ID to clipboard: ', err);
            });
          }}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-none"
          title="Copy ID to clipboard"
        >
          <Copy />
        </Button>
      </div>
    </>
  );
};

export default ResourceIdPart;
