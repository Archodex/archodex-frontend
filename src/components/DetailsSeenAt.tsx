import React from 'react';

import { locale } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

interface DetailsSeenAtProps {
  lastSeenAt?: Date;
  firstSeenAt?: Date;
}

const dateStringOptions: { dateStyle: 'long'; timeStyle: 'long' } = { dateStyle: 'long', timeStyle: 'long' };

const skeletonDateString = new Date(0).toLocaleString(locale, dateStringOptions);
const SkeletonDate = () => (
  <Skeleton className="ml-4 w-fit">
    <span className="text-transparent">{skeletonDateString}</span>
  </Skeleton>
);

const DetailsSeenAt: React.FC<DetailsSeenAtProps> = ({ lastSeenAt, firstSeenAt }) => (
  <div className="grid">
    <div className="my-4">
      <h5 className="italic text-left truncate">From</h5>
      {firstSeenAt ? (
        <h4 className="text-left truncate ml-4 font-semibold">
          {firstSeenAt.toLocaleString(locale, dateStringOptions)}
        </h4>
      ) : (
        <SkeletonDate />
      )}
    </div>
    <div>
      <h5 className="italic text-left truncate">To</h5>
      {lastSeenAt ? (
        <h4 className="text-left truncate ml-4 font-semibold">
          {lastSeenAt.toLocaleString(locale, dateStringOptions)}
        </h4>
      ) : (
        <SkeletonDate />
      )}
    </div>
  </div>
);

export default DetailsSeenAt;
