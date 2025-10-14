import React from 'react';

import RegisterPasskey from './settings/RegisterPasskey';

const Settings: React.FC = () => {
  return (
    <div className="w-full p-10">
      <h1 className="scroll-m-20 text-4xl font-extrabold lg:text-5xl">User Settings</h1>
      <RegisterPasskey />
    </div>
  );
};

export default Settings;
