const RELEASE_STATUS_URL = "https://docs.sceneforge.org/.release-status.json";

module.exports = async ({ github, core }) => {
  const draft = process.env.RELEASE_DRAFT;
  const name = process.env.RELEASE_NAME;
  const prerelease = process.env.RELEASE_PRERELEASE;
  const artifact = process.env.RELEASE_ARTIFACT;

  const errors = [];

  if (draft !== "false" && draft !== false) {
    errors.push({
      title: "Draft release found",
      message: "Draft release found for the release",
    });
  }

  if (/^v([0-9]+)\.([0-9]+)\.([0-9]+)$/.test(name) === false) {
    errors.push({
      title: "Invalid release name",
      message: "Release name must follow the semantic versioning format with no pre-release or build metadata",
    });
  }

  if (prerelease !== "false" && prerelease !== false) {
    errors.push({
      title: "Pre-release found",
      message: "Pre-release found for the release",
    });
  }

  if (artifact === undefined && artifact === null && artifact === "") {
    errors.push({
      title: "Artifact not found",
      message: "The release must have an artifact URL linked to it",
    });
  }

  try {
    const result = await fetch(RELEASE_STATUS_URL);
    if (result.status >= 200 && result.status < 300) {
      const currentReleaseStatus = await result.json();

      if (
        typeof currentReleaseStatus === "object"
        && currentReleaseStatus !== null
        && "name" in currentReleaseStatus
        && typeof currentReleaseStatus.name === "string"
      ) {
        if (currentReleaseStatus.name === name) {
          errors.push({
            title: "Already released",
            message: `The release "${name}" is currently published`,
          });
        }
      }
    }
    else if (result.status === 404) {
      core.warning("Current release status is not found");
    }
    else {
      errors.push({
        title: "Unable to fetch current release status",
        message: `Failed to fetch "${RELEASE_STATUS_URL}", status code: ${result.status}`,
      });
    }
  } catch (error) {
    errors.push({
      title: "Current Release Status not found",
      message: `Unable to find the current release status: ${typeof error === "object" && "message" in error ? error.message : error}`,
    });
  }

  if (errors.length > 0) {
    core.summary.addHeading("Release validation failed", 2);

    for (const error of errors) {
      core.error(error.title, error.message);
      core.summary.addDetails(error.title, error.message);
    }

    core.summary.write();

    core.setFailed("Release validation failed");
  }
  else {
    core.summary.addHeading("Release validation success", 2);
    core.summary.addTable([
      [{ data: "Key", header: "true" }, { data: "Value", header: "true" }],
      [{ data: "Draft" }, { data: draft }],
      [{ data: "Name" }, { data: name }],
      [{ data: "Pre-release" }, { data: prerelease }],
      [{ data: "Artifact" }, { data: artifact }],
    ]);
    core.summary.write();
  }
};
