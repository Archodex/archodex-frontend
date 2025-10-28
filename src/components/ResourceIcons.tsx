import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { awsIconUrl, labelForResourceType, lucideIconUrl, simpleIconUrl } from '@/lib/utils';

export interface ResourceIconsProps {
  id: ResourceId;
  parentResourceId?: ResourceId;
  highlighted?: boolean;
  heightInPixels?: number;
}

const ICON_ASPECT_RATIO = 27 / 39;

const ResourceIcons: React.FC<ResourceIconsProps> = ({
  id,
  parentResourceId = [],
  highlighted = false,
  heightInPixels = 39,
}) => {
  const icons = [];

  for (let i = parentResourceId.length; i < id.length - 1; i++) {
    const curResourceId = id.slice(0, i + 1);
    const curIconUrl = iconUrl(curResourceId);

    icons.push(
      <TooltipProvider key={i}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={iconClassName(highlighted)}
              style={{
                mask: `url(${curIconUrl}) no-repeat center left / 86%`,
                height: `${String(heightInPixels)}px`,
                width: `${String(heightInPixels * ICON_ASPECT_RATIO)}px`,
              }}
            />
          </TooltipTrigger>
          <TooltipContent className="z-1000">
            {labelForResourceType(id[i].type)}: {id[i].id}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
  }

  icons.push(
    <TooltipProvider key={id.length - 1}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={iconClassName(highlighted)}
            style={{
              mask: `url(${iconUrl(id)}) no-repeat center left / 86%`,
              height: `${String(heightInPixels)}px`,
              width: `${String(heightInPixels * ICON_ASPECT_RATIO)}px`,
            }}
          />
        </TooltipTrigger>
        <TooltipContent className="z-1000">
          {labelForResourceType(id.at(-1)?.type)}: {id.at(-1)?.id}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );

  return <>{icons}</>;
};

const iconClassName = (highlighted: boolean) => {
  const classes = [];

  if (highlighted) {
    classes.push('bg-black');
  } else {
    classes.push('bg-primary');
  }

  return classes.join(' ');
};

const iconUrl = (id: ResourceId) => {
  // Remove leading Kubernetes Service for services running inside a Kubernetes cluster
  if (
    id[0].type === 'Kubernetes Cluster' &&
    id[1]?.type === 'Namespace' &&
    id[2]?.type === 'Service' &&
    id.length > 3
  ) {
    id = id.slice(3);
  }

  switch (id[0].type) {
    case 'Secret Value':
      return lucideIconUrl('key');

    case 'GitHub Service':
      switch (id[id.length - 1].type) {
        case 'Actor':
          return lucideIconUrl('github');
        case 'Organization':
          return lucideIconUrl('building-2');
        case 'GitHub Actions Workflow':
          return simpleIconUrl('githubactions');
        case 'Git Repository':
          return lucideIconUrl('book-marked');
        case 'Blob':
          return lucideIconUrl('file-code');
      }

      return simpleIconUrl('github');

    case 'HashiCorp Vault Service':
      switch (id[id.length - 1].type) {
        case 'Secrets Engine Mount':
          return lucideIconUrl('book-key');
        case 'Secret':
          return lucideIconUrl('file-key');
      }

      return simpleIconUrl('vault');

    case 'Kubernetes Cluster':
      switch (id[id.length - 1].type) {
        case 'Container':
          return lucideIconUrl('box');
        case 'CronJob':
          return lucideIconUrl('clock');
        case 'DaemonSet':
          return lucideIconUrl('square-stack');
        case 'Deployment':
          return lucideIconUrl('rotate-cw');
        case 'Namespace':
          return lucideIconUrl('square-dashed');
        case 'Pod':
          return lucideIconUrl('container');
        case 'Service':
          return lucideIconUrl('network');
        case 'StatefulSet':
          return lucideIconUrl('database');
      }

      return simpleIconUrl('kubernetes');

    case 'Container Repository':
      switch (id[1]?.type) {
        case 'Container Image':
          switch (id[2]?.type) {
            case 'Container Digest':
              return lucideIconUrl('hash');
          }

          return lucideIconUrl('layers-2');
      }

      return lucideIconUrl('layers');

    case 'Stripe API':
      return simpleIconUrl('stripe');

    case 'SendGrid API':
      return simpleIconUrl('sendgrid');
  }

  return awsIconUrl('Res_General-Icons', 'Res_Documents');
};

export default ResourceIcons;
