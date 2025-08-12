using Masterloop.Cloud.WebAPI.Models;

namespace Masterloop.Cloud.WebAPI.Templates
{
    public class ForgotPasswordTemplates
    {
        public string GetForgotPasswordEmailTemplate_English(ForgotPasswordRequest rqstData, string token)
        {
            var resetLink = string.IsNullOrWhiteSpace(rqstData.ResetURL) ? "" : rqstData.ResetURL.Replace("%7Btoken%7D", token);

            var emailBody = $@"
            <body style='color:#666; font-family:sans-serif;'>
                <p>&nbsp;</p>
                <table width='800' border='0' align='center' cellpadding='10' cellspacing='0' style='text-align:center; background-color:#FFFFFF; color:#666; border-radius:5px; border:1px solid rgba(100, 100, 100, 0.25);'>
                    <tr><td>&nbsp;</td></tr>
                    <tr>
                        <td>
                            <div style='background:#f5f5f5; border:1px solid #e9e9e9; width:750px; padding:10px 0; border-radius:5px; margin:0 auto;'>
                                <table width='96%' border='0' align='center' cellpadding='0' cellspacing='0'>
                                    <tr></tr>
                                    <tr>
                                        <td align='left' style='font-size:14px; font-family:sans-serif; font-weight:100;'>
                                            Hi ,
                                        </td>
                                    </tr>
                                    <tr><td height='10'></td></tr>
                                    <tr>
                                        <td align='left' style='font-size:14px; font-family:sans-serif; font-weight:100;'>
                                            A password reset request has recently been made for your <span style='font-weight:600;'>CityBike MCS</span> account
                                            <span style='color:#000; font-size:14px; font-weight:100;'>{rqstData.Email}</span>
                                        </td>
                                    </tr>
                                    <tr><td height='10'></td></tr>
                                    <tr>
                                        <td align='left' style='font-size:14px; font-family:sans-serif; font-weight:100;' colspan='2'>
                                            Please click
                                            <a href='{resetLink}' style='text-decoration:none; font-family:sans-serif; color:#1267EA;'>here</a> to change your password.
                                        </td>
                                    </tr>
                                    <tr><td height='20'></td></tr>
                                    <tr>
                                        <td align='left' style='font-size:14px; font-family:sans-serif;'>
                                            If you did not request to have your password reset, simply disregard this email and no changes will be made to your account.
                                        </td>
                                    </tr>
                                    <tr><td colspan='3' align='left'></td></tr>
                                    <tr>
                                        <td align='left' style='font-size:14px; font-family:sans-serif;'>
                                            If you have any questions or need help, please contact us at <a href='mailto:citybike@embla.asia'>citybike@embla.asia</a> or simply reply to this message.
                                        </td>
                                    </tr>
                                    <tr><td style='padding:10px;'></td></tr>
                                    <tr>
                                        <td align='left' style='font-size:14px; font-family:sans-serif;'>
                                            Regards,
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align='left' style='font-size:14px; font-family:sans-serif;'>
                                            CityBike Support Team
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                    <tr><td>&nbsp;</td></tr>
                </table>
            </body>";

            return emailBody;
        }
    }
}

