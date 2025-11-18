import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

export default auth;



export const signAccessToken = (user_id, user_role, email) => {
  return jwt.sign(
    {
      user_id,
      user_role,
      email
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

const loginUser = async (req, res) => {
    try {
        const { email, password, device_token, device_type } = req.body;

        let foundUser =
            await User.findOne({ email }) ||
            await Teacher.findOne({ email }) ||
            await Student.findOne({ email }) ||
            await SubAdmin.findOne({ email }) ||
            await User.findOne({ email }) ||
            await Driver.findOne({ email }) ||
            await Demo.findOne({ email });

        if (!foundUser) {
            return handleResponse(res, 401, 'Invalid email or password');
        }

        if (!foundUser.role) {
            if (foundUser instanceof Driver) foundUser.role = 'driver';
        }

        if (
            (foundUser.role === 'student' || foundUser.role === 'Teacher' || foundUser.role === 'sub_admin') &&
            !foundUser.status
        ) {
            const messages = {
                student: 'Your student account is deactivated. Please contact your school.',
                Teacher: 'Your teacher account is deactivated. Please contact your school.',
                sub_admin: 'Your sub-admin account is deactivated. Please contact your school.',
            };
            return handleResponse(res, 403, messages[foundUser.role] || 'Account is deactivated.');
        }

        let userPasswordField = 'password';
        if (foundUser.role === 'Teacher') {
            userPasswordField = 'teacher_password';
        }
        
                 if (!foundUser[userPasswordField]) {
            return handleResponse(res, 401, 'User does not have a password set.');
        }

        const isMatch = await bcrypt.compare(password, foundUser[userPasswordField]);
        if (!isMatch) {
            return handleResponse(res, 401, 'Invalid email or password');
        }

        if (device_token) {
            switch (foundUser.role) {
                case 'student':
                    await Student.findByIdAndUpdate(foundUser._id, { device_token, device_type });
                    break;
                case 'Teacher':
                    await Teacher.findByIdAndUpdate(foundUser._id, { device_token, device_type });
                    break;
                case 'sub_admin':
                    await SubAdmin.findByIdAndUpdate(foundUser._id, { device_token, device_type });
                    break;
                case 'school':
                    await User.findByIdAndUpdate(foundUser._id, { device_token, device_type });
                    break;
                case 'driver':
                    await Driver.findByIdAndUpdate(foundUser._id, { device_token, device_type });
                    break;
                default:
                    if (foundUser instanceof Demo) {
                        await Demo.findByIdAndUpdate(foundUser._id, { device_token, device_type });
                    }
            }
        }


        const token = await signAccessToken(foundUser._id, foundUser.role, foundUser.email);

        const baseResponse = {
            token,
            role: foundUser.role,
        };

        if (foundUser.role === 'driver') {
            baseResponse.full_name = foundUser.full_name;
            baseResponse.email = foundUser.email;
            baseResponse.assigned_vehicle_number = foundUser.assigned_vehicle_number;
        }

        if (foundUser instanceof Demo) {
            const freshUser = await Demo.findById(foundUser._id);
            const createdAt = new Date(freshUser.createdAt);
            const now = new Date();
            const diffInDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
            const trialDays = 7;
            const daysUsed = diffInDays;
            const daysLeft = Math.max(0, trialDays - daysUsed);
            const is_plan_valid = daysUsed < trialDays;

            baseResponse.school_name = foundUser.school_name;
            baseResponse.email = foundUser.email;
            baseResponse.access_control = {
                plan_type: 'Free Trial',
                is_plan_valid,
                daysUsed,
                daysLeft,
                features: Object.fromEntries(
                    Object.entries(foundUser.plan_accessibility || {}).map(([key, value]) => [
                        key.charAt(0).toUpperCase() + key.slice(1),
                        value
                    ])
                )
                //  features: foundUser.plan_accessibility || {}

            };
        }

        return handleResponse(res, 200, 'Login successful.', baseResponse);

    } catch (error) {
        console.error('Login error:', error);
        return handleResponse(res, 500, 'Internal server error.');
    }
};
