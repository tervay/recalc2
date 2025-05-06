import { Button } from '~/components/ui/button';

export default function CalcHeading({ title }: { title: string }) {
  return (
    <div className="my-10 flex flex-row justify-around">
      <h1 className="text-3xl font-bold">{title}</h1>
      <Button>Copy Link</Button>
    </div>
  );
}
