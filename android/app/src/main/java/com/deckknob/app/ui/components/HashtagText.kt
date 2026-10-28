package com.deckknob.app.ui.components

import androidx.compose.foundation.text.ClickableText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import java.util.regex.Pattern

private val HASHTAG_MENTION_REGEX = Pattern.compile("(@\\w+|#\\w+)")

@Composable
fun HashtagText(
    text: String,
    modifier: Modifier = Modifier,
    color: Color = Color.White,
    highlightColor: Color = Color(0xFFDFE104),
    fontSize: TextUnit = 14.sp,
    maxLines: Int = Int.MAX_VALUE,
    overflow: TextOverflow = TextOverflow.Clip,
    onHashtagClick: ((String) -> Unit)? = null,
    onMentionClick: ((String) -> Unit)? = null
) {
    if (text.isEmpty()) return

    val annotatedString = buildAnnotatedString {
        val matcher = HASHTAG_MENTION_REGEX.matcher(text)
        var lastEnd = 0
        while (matcher.find()) {
            val start = matcher.start()
            val end = matcher.end()
            if (start > lastEnd) {
                append(text.substring(lastEnd, start))
            }
            val match = matcher.group() ?: ""
            val tagStart = length
            append(match)
            addStyle(
                style = SpanStyle(
                    color = highlightColor,
                    fontWeight = FontWeight.Bold
                ),
                start = tagStart,
                end = length
            )
            if (match.startsWith("#")) {
                addStringAnnotation(
                    tag = "HASHTAG",
                    annotation = match.substring(1),
                    start = tagStart,
                    end = length
                )
            } else if (match.startsWith("@")) {
                addStringAnnotation(
                    tag = "MENTION",
                    annotation = match.substring(1),
                    start = tagStart,
                    end = length
                )
            }
            lastEnd = end
        }
        if (lastEnd < text.length) {
            append(text.substring(lastEnd))
        }
    }

    ClickableText(
        text = annotatedString,
        modifier = modifier,
        style = TextStyle(
            color = color,
            fontSize = fontSize
        ),
        maxLines = maxLines,
        overflow = overflow,
        onClick = { offset ->
            annotatedString.getStringAnnotations(tag = "HASHTAG", start = offset, end = offset)
                .firstOrNull()?.let { annotation ->
                    onHashtagClick?.invoke(annotation.item)
                    return@ClickableText
                }
            annotatedString.getStringAnnotations(tag = "MENTION", start = offset, end = offset)
                .firstOrNull()?.let { annotation ->
                    onMentionClick?.invoke(annotation.item)
                    return@ClickableText
                }
        }
    )
}

