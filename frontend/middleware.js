import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() { return request.cookies.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const { pathname } = request.nextUrl;

    const isLogin = pathname === '/login';

    // Redirect unauthenticated users to /login
    if (!user && !isLogin) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users away from /login
    if (user && isLogin) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    // Role-based route protection
    if (user) {
        const role = user.user_metadata?.role;

        const routePermissions = {
            '/users': ['admin'],
            '/fees': ['admin', 'office_staff'],
            '/reports': ['admin', 'office_staff'],
            '/teacher-attendance': ['admin', 'teacher'],
            '/student-attendance': ['admin', 'teacher'],
            '/classes': ['admin', 'teacher'],
            '/students': ['admin', 'teacher', 'office_staff'],
            '/my-fees': ['student'],
            '/homework': ['admin', 'teacher', 'student'],
            '/notices': ['admin', 'teacher', 'student'],
            '/resources': ['admin', 'teacher', 'student'],
        };

        // Check if the current path starts with any of the restricted routes
        for (const [route, allowedRoles] of Object.entries(routePermissions)) {
            if (pathname.startsWith(route) && !allowedRoles.includes(role)) {
                const url = request.nextUrl.clone();
                url.pathname = '/dashboard';
                return NextResponse.redirect(url);
            }
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
