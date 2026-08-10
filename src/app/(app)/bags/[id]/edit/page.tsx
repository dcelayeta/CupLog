import { notFound } from "next/navigation";
import { getBagById } from "@/lib/bags/queries";
import BagFormClient from "@/components/bags/BagFormClient";
import { createBag, updateBag } from "@/lib/bags/actions";
import { getRoasterOptions } from "@/lib/roasters/queries";

export default async function EditBagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bag, roasters] = await Promise.all([getBagById(Number(id)), getRoasterOptions()]);
  if (!bag) notFound();

  const boundUpdateAction = updateBag.bind(null, bag.id);

  return (
    <BagFormClient
      mode="edit"
      initialData={bag}
      createAction={createBag}
      updateAction={boundUpdateAction}
      roasters={roasters}
    />
  );
}
