import { notFound } from "next/navigation";
import { getBagById } from "@/lib/bags/queries";
import BagFormClient from "@/components/bags/BagFormClient";
import { createBag, updateBag } from "@/lib/bags/actions";

export default async function EditBagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bag = await getBagById(Number(id));
  if (!bag) notFound();

  const boundUpdateAction = updateBag.bind(null, bag.id);

  return (
    <BagFormClient
      mode="edit"
      initialData={bag}
      createAction={createBag}
      updateAction={boundUpdateAction}
    />
  );
}
