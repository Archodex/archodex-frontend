import { Button } from '@/components/ui/button';
import { redirectToPasskeyRegistration } from '@/lib/auth';

const RegisterPasskey: React.FC = () => {
  return (
    <>
      <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold first:mt-0 my-6">Passkey Authentication</h2>
      <Button onClick={redirectToPasskeyRegistration}>Register A New Passkey</Button>
    </>
  );
};

export default RegisterPasskey;
