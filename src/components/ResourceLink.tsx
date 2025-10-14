import React from 'react';

import { ExternalLink } from 'lucide-react';
import { labelForResource } from '@/lib/utils';

export interface ResourceLinkProps {
  id: ResourceId;
  text?: string;
  className?: string;
}

const ResourceLink: React.FC<ResourceLinkProps> = ({ id, text, className = '' }) => {
  const urlFunc = links[linksKey(id)];
  const label = text ?? labelForResource(id);

  if (urlFunc) {
    return (
      <a href={urlFunc(id)} target="_blank" rel="noreferrer" className={`flex items-center ${className}`}>
        <span>{label}</span>
        <ExternalLink size={16} className="inline ml-1" />
      </a>
    );
  } else {
    return <h4 className={className}>{label}</h4>;
  }
};

const links: Record<string, ((id: ResourceId) => string) | undefined> = {};

const linksKey = (id: string[] | ResourceId) => {
  if (id.length === 0) {
    throw new Error('Invalid ID or ID Type');
  }

  if (typeof id[0] === 'string') {
    return (id as string[]).join('::');
  } else {
    return (id as ResourceId).map((idPart) => idPart.type).join('::');
  }
};

links[linksKey(['GitHub Service'])] = (id) => id[0].id;
links[linksKey(['GitHub Service', 'Organization'])] = (id) => `${id[0].id}/${id[1].id}`;
links[linksKey(['GitHub Service', 'Organization', 'Git Repository'])] = (id) => `${id[0].id}/${id[1].id}/${id[2].id}`;
links[linksKey(['GitHub Service', 'Organization', 'Git Repository', 'Blob'])] = (id) =>
  `${id[0].id}/${id[1].id}/${id[2].id}/blob/HEAD/${id[3].id}`;
links[linksKey(['GitHub Service', 'Organization', 'Git Repository', 'GitHub Actions Workflow'])] = (id) => {
  const [repoFilename, gitObject] = id[3].id.split('@');
  const filename = repoFilename.slice(id[2].id.length + 1);

  return `${id[0].id}/${id[1].id}/${id[2].id}/blob/${gitObject}/${filename}`;
};

export default ResourceLink;
