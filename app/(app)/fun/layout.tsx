import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { TabLinks } from "@/components/ui/tabs";

export default function FunLayout({ children }: LayoutProps<"/fun">) {
  return (
    <PageContainer>
      <PageHeader title="Fun" description="Des jeux simples pour se découvrir encore, et des idées pour vos soirées.">
        <TabLinks
          items={[
            { href: "/fun", label: "Tout", exact: true },
            { href: "/fun/questions", label: "Questions" },
            { href: "/fun/party", label: "Défis de soirée" },
            { href: "/fun/tonight", label: "Ce soir" },
            { href: "/fun/wheel", label: "Roue" },
            { href: "/fun/who", label: "Qui de nous deux ?" },
            { href: "/fun/quiz", label: "Quiz" },
            { href: "/fun/challenges", label: "Nos défis" },
            { href: "/fun/badges", label: "Badges" },
          ]}
        />
      </PageHeader>
      {children}
    </PageContainer>
  );
}
