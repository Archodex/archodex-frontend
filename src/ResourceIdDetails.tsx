import React from 'react';
import ResourceIdPart from './ResourceIdPart';

interface ResourceIdDetailsProps {
  id: ResourceId;
}

const ResourceIdDetails: React.FC<ResourceIdDetailsProps> = ({ id }) => (
  <>
    {id.slice().map((_, i) => (
      <div key={i} className="my-4">
        <ResourceIdPart id={id.slice(0, id.length - i)} />
      </div>
    ))}
  </>
);

export default ResourceIdDetails;
