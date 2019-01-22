import React from "react";

const Layout = (props: any) => (
    <div className="layout" style={{flexDirection: props.flexDirection || "row"}}>
        {
            props.children
        }
    </div>
);

export default Layout;
