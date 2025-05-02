import { useQueryParams } from "~/lib/hooks";
import { NumberParam, StringParam } from "~/lib/types/queryParams";

export function meta() {
  return [
    { title: "Belt Calculator" },
    { name: "description", content: "Belt Calculator" },
  ];
}

export default function Belts() {
  const queryParams = useQueryParams<{
    hello: string;
    foo: number;
  }>(
    {
      hello: StringParam,
      foo: NumberParam,
    },
    {
      hello: "world",
      foo: 1,
    }
  );

  return <div>{queryParams.hello}</div>;
}
