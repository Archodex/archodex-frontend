import type { DialogProps } from '@radix-ui/react-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Link } from 'react-router';
import ReportApiKeyCreateForm from './ReportApiKeyCreateForm';
import { useState } from 'react';
import ReportApiKeyCreateFormState from './ReportApiKeyCreateFormState';

const GettingStartedDialog: React.FC<DialogProps> = (props) => {
  const [reportApiKeyCreateFormState, setReportApiKeyCreateFormState] = useState(
    ReportApiKeyCreateFormState.InputDescription,
  );

  return (
    <Dialog {...props}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Getting Started</DialogTitle>
        </DialogHeader>
        <div>
          <p>
            We haven&apos;t observed any resources yet. Check out our{' '}
            <a
              href={`https://${(import.meta.env.VITE_ARCHODEX_DOMAIN as string | undefined) ?? 'archodex.com'}/docs/getting-started#using-the-agent`}
              target="_blank"
              rel="noreferrer"
            >
              Using the Agent
            </a>{' '}
            docs to learn how to report observations to Archodex.
          </p>
          <h3 className="font-semibold">Need a Report API Key?</h3>
          <p>
            We&apos;ve got you covered! Enter a description below and generate a key. You can also manage your keys in{' '}
            <Link to="../settings">Account Settings</Link>.
          </p>
          <ReportApiKeyCreateForm
            reportApiKeyCreateFormState={reportApiKeyCreateFormState}
            setReportApiKeyCreateFormState={setReportApiKeyCreateFormState}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GettingStartedDialog;
