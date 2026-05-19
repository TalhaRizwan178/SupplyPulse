const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organization');
const { sendEmail } = require('../services/emailService');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '../assets/logo.png');

function buildCredentialsHtml({ email, password, role, badge, title }) {
  const hasLogo = fs.existsSync(LOGO_PATH);
  const logoTag = hasLogo
    ? `<img src="cid:supplypulse-logo" alt="SupplyPulse" width="52" height="52" style="display:block;margin:0 auto 12px auto;border-radius:10px;border:1px solid #4D4740;">`
    : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#1A1714;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1A1714;padding:32px 16px;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#272320;border-radius:16px;overflow:hidden;border:1px solid #4D4740;">
  <!-- Header -->
  <tr><td style="background:#1E1B18;padding:28px 32px 24px;text-align:center;border-bottom:1px solid #4D4740;">
    <div style="width:44px;height:3px;background:#6ADE95;border-radius:2px;margin:0 auto 18px auto;"></div>
    ${logoTag}
    <div style="font-size:21px;font-weight:800;color:#F4EFE8;">Supply<span style="color:#6ADE95;">Pulse</span></div>
    <div style="font-size:11px;color:#867E76;margin-top:4px;letter-spacing:1.4px;text-transform:uppercase;">Autonomous Supply Chain Agent</div>
    <div style="display:inline-block;margin-top:14px;background:#1C3E2C;border:1px solid #6ADE9544;color:#6ADE95;font-size:11px;font-weight:700;padding:4px 14px;border-radius:20px;letter-spacing:0.8px;text-transform:uppercase;">${badge}</div>
  </td></tr>
  <!-- Title -->
  <tr><td style="padding:24px 32px 0 32px;">
    <h1 style="margin:0;font-size:17px;font-weight:700;color:#F4EFE8;">${title}</h1>
    <p style="margin:8px 0 0 0;font-size:14px;color:#B7AFA7;">An admin has set up your SupplyPulse account. Use the credentials below to log in.</p>
  </td></tr>
  <!-- Credentials box -->
  <tr><td style="padding:20px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1E1B18;border-radius:12px;border:1px solid #4D4740;overflow:hidden;">
      <tr><td style="background:#1C3E2C;padding:10px 18px;border-bottom:1px solid #6ADE9533;">
        <span style="font-size:10px;color:#6ADE95;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">Your Login Credentials</span>
      </td></tr>
      <tr><td style="padding:16px 18px;border-bottom:1px solid #4D4740;">
        <div style="font-size:11px;color:#867E76;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Email</div>
        <div style="font-size:15px;color:#6ADE95;font-weight:700;font-family:'Courier New',monospace;letter-spacing:0.5px;">${email}</div>
      </td></tr>
      <tr><td style="padding:16px 18px;border-bottom:1px solid #4D4740;">
        <div style="font-size:11px;color:#867E76;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Password</div>
        <div style="font-size:18px;color:#6ADE95;font-weight:800;font-family:'Courier New',monospace;letter-spacing:2px;">${password}</div>
      </td></tr>
      <tr><td style="padding:16px 18px;">
        <div style="font-size:11px;color:#867E76;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Role</div>
        <div style="display:inline-block;background:#1C3E2C;border:1px solid #6ADE9555;color:#6ADE95;font-size:12px;font-weight:700;padding:3px 12px;border-radius:6px;">${role}</div>
      </td></tr>
    </table>
  </td></tr>
  <!-- Warning -->
  <tr><td style="padding:0 32px 24px 32px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#4A2418;border-radius:10px;border-left:3px solid #D45C48;">
      <tr><td style="padding:12px 14px;">
        <span style="font-size:13px;color:#F4EFE8;font-weight:500;">&#9888; Please log in and change your password immediately.</span>
      </td></tr>
    </table>
  </td></tr>
  <!-- Divider -->
  <tr><td style="padding:0 32px;"><div style="height:1px;background:#4D4740;"></div></td></tr>
  <!-- Footer -->
  <tr><td style="padding:18px 32px;text-align:center;">
    <div style="font-size:12px;font-weight:700;color:#B7AFA7;">Supply<span style="color:#6ADE95;">Pulse</span></div>
    <div style="font-size:11px;color:#615B54;margin-top:5px;">This is an automated credentials email. Keep it confidential.</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';

exports.signupOrganization = async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { orgName, businessEmail, adminFullName, email, password } = req.body;
    if (!orgName || !businessEmail || !email || !password) {
      return res.status(400).json({ error: 'orgName, businessEmail, email, and password are required' });
    }

    const existingOrg = await Organization.findOne({ businessEmail: businessEmail.toLowerCase().trim() });
    if (existingOrg) {
      return res.status(409).json({ error: 'An organization with this business email already exists' });
    }

    const org = new Organization({
      name: orgName.trim(),
      businessEmail: businessEmail.toLowerCase().trim(),
    });
    await org.save({ session });

    const admin = new User({
      organizationId: org._id,
      fullName: adminFullName || '',
      email: email.toLowerCase().trim(),
      password,
      role: 'admin',
    });
    await admin.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Issue JWT immediately so they land on dashboard
    const token = jwt.sign(
      { id: admin._id, role: admin.role, organizationId: org._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: admin._id, email: admin.email, role: admin.role, fullName: admin.fullName, organizationId: org._id },
      organization: { id: org._id, name: org.name },
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('[Signup]', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: user._id, role: user.role, organizationId: user.organizationId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, fullName: user.fullName, organizationId: user.organizationId }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.ssoLogin = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
    if (!user) {
      return res.status(404).json({ message: 'No account found. Please ask your admin to create your account.' });
    }
    
    const token = jwt.sign(
      { id: user._id, role: user.role, organizationId: user.organizationId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user._id, email: user.email, role: user.role, organizationId: user.organizationId }
    });
  } catch (error) {
    console.error('SSO error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }
    const users = await User.find({ organizationId: req.user.organizationId }, { password: 0 }).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { email, password, role, fullName } = req.body;

    const existing = await User.findOne({ email, organizationId: req.user.organizationId });
    if (existing) return res.status(400).json({ message: 'User already exists in your organization' });

    const user = new User({
      organizationId: req.user.organizationId,
      fullName: fullName || '',
      email: email.toLowerCase().trim(),
      password,
      role: role || 'analyst',
    });
    await user.save();

    // Send welcome email with credentials
    const roleDisplay = (role || 'analyst').charAt(0).toUpperCase() + (role || 'analyst').slice(1);
    console.log(`[Email] Sending credentials to: ${email}`);
    try {
      const result = await sendEmail({
        to: email,
        subject: `Your SupplyPulse account is ready — ${roleDisplay}`,
        body: `Email: ${email}\nPassword: ${password}\nRole: ${roleDisplay}`,
        htmlOverride: buildCredentialsHtml({
          email, password, role: roleDisplay,
          badge: `${roleDisplay} Access Granted`,
          title: 'Your Account is Ready',
        }),
      });
      if (result?.mocked) console.log('[Email] Credentials email mocked — SMTP not configured');
      else console.log('[Email] Credentials email sent to:', email);
    } catch (err) {
      console.error('[Email] Credentials send failed:', err.message);
    }

    res.status(201).json({ message: 'User created successfully', user: { email: user.email, role: user.role } });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resendCredentials = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden. Admin access required.' });
    }

    const { userId } = req.params;
    const { password } = req.body;
    const user = await User.findOne({ _id: userId, organizationId: req.user.organizationId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!password) return res.status(400).json({ message: 'Password is required to resend credentials' });

    user.password = password;
    await user.save();
    const tempPassword = password;

    const roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    await sendEmail({
      to: user.email,
      subject: `Your SupplyPulse credentials have been reset`,
      body: `Email: ${user.email}\nPassword: ${tempPassword}\nRole: ${roleDisplay}`,
      htmlOverride: buildCredentialsHtml({
        email: user.email, password: tempPassword, role: roleDisplay,
        badge: 'Credentials Reset',
        title: 'Your Credentials Were Reset',
      }),
    });

    res.json({ message: 'Credentials resent successfully' });
  } catch (error) {
    console.error('Resend credentials error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
