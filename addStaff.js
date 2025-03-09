import { put } from '@vercel/blob';
import bcrypt from 'bcrypt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const staffData = { name, phone, password: hashedPassword };
        
        const response = await put(`staff/${phone}.json`, JSON.stringify(staffData), {
            access: 'private',
        });
        
        return res.status(200).json({ message: 'Staff added successfully', data: response });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to add staff' });
    }
}
