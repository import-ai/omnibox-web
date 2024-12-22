import React from "react";

type ResourceContentProps = {
  resourceId: string | null;
};

const ResourceContent: React.FC<ResourceContentProps> = ({ resourceId }) => {
  if (!resourceId) {
    return <p>Select a resource to view its content.</p>;
  }

  // Replace this with actual content fetching and rendering logic
  return (
    <div>
      <h2>Resource Content</h2>
      <p>Displaying content for resource ID: {resourceId}</p>
    </div>
  );
};

export default ResourceContent; 