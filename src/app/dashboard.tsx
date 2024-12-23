import {MainSidebar} from "@/components/main-sidebar"
import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar"
import {useParams} from "react-router";
import * as React from "react";
import {Resource} from "@/types/resource";
import axios from "axios";

const baseUrl = "/api/v1/resources"

export default function Dashboard() {
  const {namespace, resourceId} = useParams();
  const [resource, setResource] = React.useState<Resource>();

  React.useEffect(() => {
    if (resourceId) {
      axios.get(`${baseUrl}/${resourceId}`).then(response => {
        setResource(response.data);
      }).catch(error => {
        console.error(error);
      })
    }
  }, [namespace, resourceId])

  return (
    <SidebarProvider>
      <MainSidebar payload={{namespace: namespace ?? "", resource}}/>
      <SidebarInset>
        {resource?.content}
      </SidebarInset>
    </SidebarProvider>
  )
}
