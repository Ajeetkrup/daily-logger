import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/app/lib/mongodb';
import Log from '@/app/models/log';

export async function GET() {
  await connectDB();

  try {
    const logs = await Log.find().sort({ timestamp: -1 });
    console.log("logs -- ", logs);
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Logs retrieval failed' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  await connectDB();

  try {
    const body = await req.json();
    console.log("body -- ", body);
    const log = await Log.create(body);
    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Log creation failed' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  await connectDB();

  try {
    const { id } = await req.json();
    await Log.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Log deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Log deletion failed' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  await connectDB();

  try {
    const { id, content, date } = await req.json();
    const updatedLog = await Log.findByIdAndUpdate(
      id, 
      { content, date }, 
      { new: true }
    );
    return NextResponse.json(updatedLog);
  } catch (error) {
    return NextResponse.json({ error: 'Log update failed' }, { status: 400 });
  }
}