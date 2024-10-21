package com.expensify.chat;

import android.content.Context;
import android.util.AttributeSet;
import android.view.Choreographer;
import android.view.View;
import android.widget.FrameLayout;

public class MyCustomView extends FrameLayout {

    public MyCustomView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        Choreographer.getInstance().postFrameCallback(new Choreographer.FrameCallback() {
            @Override
            public void doFrame(long frameTimeNanos) {
                for (int i = 0; i < getChildCount(); i++) {
                    View child = getChildAt(i);
                    child.measure(
                        MeasureSpec.makeMeasureSpec(getMeasuredWidth(), MeasureSpec.EXACTLY),
                        MeasureSpec.makeMeasureSpec(getMeasuredHeight(), MeasureSpec.EXACTLY)
                    );
                    child.layout(0, 0, child.getMeasuredWidth(), child.getMeasuredHeight());
                }
                getViewTreeObserver().dispatchOnGlobalLayout();
                Choreographer.getInstance().postFrameCallback(this);
            }
        });
    }
}