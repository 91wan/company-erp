import { ExternalProjectSiteWorkspaceView } from "./ExternalProjectSiteWorkspaceView";
import { ProjectSitesHeadquartersView } from "./ProjectSitesHeadquartersView";
import {
  buildExternalProjectSiteWorkspaceViewProps,
  buildProjectSitesHeadquartersViewProps,
  type ExternalViewModelInput,
  type HeadquartersViewModelInput,
} from "./projectSitesViewModels";

type ProjectSitesWorkspaceRendererProps = {
  usageOnly: boolean;
  externalInput: ExternalViewModelInput;
  headquartersInput: HeadquartersViewModelInput;
};

export function ProjectSitesWorkspaceRenderer({
  usageOnly,
  externalInput,
  headquartersInput,
}: ProjectSitesWorkspaceRendererProps) {
  return (
    <section className="project-sites-workspace" aria-label="项目点">
      {usageOnly ? (
        <ExternalProjectSiteWorkspaceView {...buildExternalProjectSiteWorkspaceViewProps(externalInput)} />
      ) : (
        <ProjectSitesHeadquartersView {...buildProjectSitesHeadquartersViewProps(headquartersInput)} />
      )}
    </section>
  );
}
