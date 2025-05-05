import { Button } from '~/components/ui/button';

export default function CalcHeading() {
  return (
    <div className="my-10 flex flex-row justify-around">
      <h1 className="text-3xl font-bold">Belt Calculator</h1>
      <Button>Copy Link</Button>
    </div>
  );
}
