module.exports = requestTicketTemplate = (data) => {
    const {
        SITE_URL,
        CommitteeName,
        RequesterName,
        EventName,
        URL
    } = data;

    return `
    <table cellspacing="0"
    style="width:620px; margin:auto; margin-top:30px; background:#f2f1f1; font-family:Arial, Helvetica, sans-serif; border: 1px solid #ccc; border-top: 3px solid #3d6db5;">
    
    <tr>
        <td align="center">
            <a href="${SITE_URL}">
                <img src="${SITE_URL}images/Logoblack.png"
                    style="display:block; width:190px; padding:20px" />
            </a>
        </td>
    </tr>

    <tr>
        <td style="padding: 0px 15px;">
            <img src="${SITE_URL}images/banner-7.png" alt="banner" width="100%">
        </td>
    </tr>

    <tr>
        <td style="padding: 0px 15px;">
            <br>
            <span style="font-size: 20px; font-weight: bold;">
                Hi ${CommitteeName},
            </span>
            <br><br>

            <span style="line-height: 1.5;">
                ${RequesterName} has requested tickets for ${EventName}.
            </span>

            <br><br><br>

            <a href="${URL}"
                style="font-weight: bold; background: #e62d56; padding: 8px 12px; border-radius: 3px; color: #fff; text-decoration: none; display:inline-block;">
                <img src="${SITE_URL}images/ic_template_manage.png"
                    alt=""
                    style="vertical-align: -4px; margin-right:5px;"
                    width="20px">
                Manage your requests
            </a>

            <br><br>
        </td>
    </tr>

    <tr>
        <td align="left" style="padding: 0px 15px;">
            <br>
            <span style="color: #333; line-height: 1.5;">Best Regards,</span><br>
            <span style="color: #333; line-height: 1.5;">
                Customer Services
                <span style="color:#e62d56; font-weight: bold;">eboxtickets</span>
            </span>
            <br><br>
        </td>
    </tr>

    <tr>
        <td align="center"
            style="padding:10px; background: #3d6db5; color: #fff; font-size: 14px;">
            Copyright 2026
            <a href="${SITE_URL}" style="color: #ffffff; text-decoration: none;">
                <b>eboxtickets.com</b>
            </a>
            - All Rights Reserved
        </td>
    </tr>

</table>
`;
};
