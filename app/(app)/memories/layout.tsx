import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { TabLinks } from "@/components/ui/tabs";

export default function MemoriesLayout({ children }: LayoutProps<"/memories">) {
  return (
    <PageContainer wide>
      <PageHeader title="Souvenirs" description="Vos photos et les moments qui comptent.">
        <TabLinks
          items={[
            { href: "/memories", label: "Photos", exact: true },
            { href: "/memories/albums", label: "Albums" },
            { href: "/memories/timeline", label: "Moments" },
          ]}
        />
      </PageHeader>
      {children}
    </PageContainer>
  );
}
