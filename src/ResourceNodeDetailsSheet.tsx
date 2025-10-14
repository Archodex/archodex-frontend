import React from 'react';

import { Node } from '@xyflow/react';
import { ResourceNodeData } from './ResourceNode';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet';
import { Separator } from './components/ui/separator';
import ResourceIdDetails from './ResourceIdDetails';
import DetailsSeenAt from './components/DetailsSeenAt';

interface ResourceNodeDetailsSheetProps {
  node?: Node<ResourceNodeData>;
  onDismiss: () => void;
}

const ResourceNodeDetailsSheet: React.FC<ResourceNodeDetailsSheetProps> = ({ node, onDismiss }) => (
  <Sheet
    open={!!node}
    onOpenChange={(open) => {
      if (!open) onDismiss();
    }}
  >
    <SheetContent side="right" className="w-96 overflow-scroll border-none">
      <SheetHeader>
        <SheetTitle className="text-3xl">Resource</SheetTitle>
      </SheetHeader>
      <Separator className="h-px w-full my-4 bg-primary" />
      {node && <ResourceIdDetails id={node.data.id} />}
      {node?.data.firstSeenAt && node.data.lastSeenAt && (
        <>
          <Separator className="h-px w-full my-4 bg-primary" />
          <DetailsSeenAt lastSeenAt={node.data.lastSeenAt} firstSeenAt={node.data.firstSeenAt} />
        </>
      )}
    </SheetContent>
  </Sheet>
);

export default ResourceNodeDetailsSheet;
