import { useQueryParams } from "~/lib/hooks";
import { NumberParam, StringParam } from "~/lib/types/queryParams";

export function meta() {
  return [
    { title: "Belt Calculator" },
    { name: "description", content: "Belt Calculator" },
  ];
}

interface QueryParams {
  hello: string;
  foo: number;
}

export default function Belts() {
  const queryParams = useQueryParams<QueryParams>(
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
