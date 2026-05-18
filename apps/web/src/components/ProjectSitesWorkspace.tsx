import { ProjectSitesWorkspaceRenderer } from "./project-sites/ProjectSitesWorkspaceRenderer";
import type { ProjectSitesWorkspaceProps } from "./project-sites/projectSitesWorkspaceContract";
import { useProjectSitesWorkspaceController } from "./project-sites/useProjectSitesWorkspaceController";

export function ProjectSitesWorkspace(props: ProjectSitesWorkspaceProps) {
  const controller = useProjectSitesWorkspaceController(props);

  return (
    <ProjectSitesWorkspaceRenderer
      usageOnly={controller.usageOnly}
      externalInput={controller.externalInput}
      headquartersInput={controller.headquartersInput}
    />
  );
}
